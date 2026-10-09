"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardOrder, OrderStatus } from "@/lib/orders/queries";
import { notifyStatusWebhook, notifyOrderCreatedWebhook } from "@/lib/server/notify";
import { useStaff } from "@/components/providers/StaffProvider";

interface OrderManagerContextType {
  orders: DashboardOrder[];
  queuedNewOrders: DashboardOrder[];
  acknowledgeOrder: (orderId: string, isUpdate?: boolean) => void;
  updateOrderStatus: (order: DashboardOrder, nextStatus: OrderStatus, reason?: string, rider?: { id: string; name: string; phone: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRealtimeConnected: boolean;
  refreshOrders: () => Promise<void>;
  toggleSound: () => void;
  soundEnabled: boolean;
}

const OrderManagerContext = createContext<OrderManagerContextType | null>(null);

export const useOrderManager = () => {
  const ctx = useContext(OrderManagerContext);
  if (!ctx) throw new Error("useOrderManager must be used within OrderManagerProvider");
  return ctx;
};

export function OrderManagerProvider({ children, initialOrders = [] }: { children: React.ReactNode, initialOrders?: DashboardOrder[] }) {
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [queuedNewOrders, setQueuedNewOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(initialOrders.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { hasPerm } = useStaff();

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pabbas_sound_enabled") !== "false";
    }
    return true;
  });

  const supabase = useRef(createClient());
  const acknowledgedIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          document.removeEventListener('click', unlock);
          document.removeEventListener('keydown', unlock);
        }).catch(() => { });
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);


  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {

    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const startSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;
    try {
      audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
    } catch (err) {
      console.warn("Sound play failed", err);
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pabbas_sound_enabled", String(next));
      }
      if (!next) {
        stopSound();
      } else {
        // Unlock audio on user interaction
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            // If there's already queued orders, play it for real
            if (queuedNewOrders.length > 0) {
              audioRef.current?.play().catch(() => { });
            }
          }).catch(e => console.warn("Audio unlock failed", e));
        }
      }
      return next;
    });
  }, [stopSound, queuedNewOrders.length]);

  useEffect(() => {
    if (queuedNewOrders.length > 0 && soundEnabled) {
      startSound();
    } else {
      stopSound();
    }
  }, [queuedNewOrders.length, soundEnabled, startSound, stopSound]);

  // Initial Sync & Polling
  const refreshOrders = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase.current
        .from("orders")
        .select("id, order_number, customer_phone, customer_name, items, total, status, order_type, source, address, landmark, city, pincode, table_number, confirmed_at, amend_window_until, amended_at, amendment_count, original_items, cancel_reason, cancelled_by, cancelled_at, cancel_requested_at, created_at, updated_at, items_json, rider_id, rider_name, rider_phone, collected_amount, is_collected")
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchErr) throw fetchErr;

      const latestOrders = (data ?? []) as DashboardOrder[];
      setOrders(latestOrders);
      setLastUpdated(new Date());
      setError(null);

      // Detect unacknowledged new orders (excluding POS orders, as staff created them)
      const unackNew = latestOrders.filter(o => {
        if (o.source === 'pos') return false;

        // It's also unacknowledged if it's an existing order (e.g. preparing) BUT has new additions
        if (Array.isArray(o.items_json) && o.items_json.some((i: any) => i.is_new_addition)) {
          if (hasPerm("mark_ready") && !hasPerm("view_orders_full") && o.status !== 'preparing') return false;
          return true;
        }

        if (acknowledgedIds.current.has(o.id)) return false;

        const isKitchenOnly = hasPerm("mark_ready") && !hasPerm("view_orders_full");
        const isAdminOrCounter = hasPerm("view_orders_full");

        if (isAdminOrCounter && o.status === 'new') return true;

        return false;
      });

      setQueuedNewOrders(prev => {
        const prevIds = new Set(prev.map(p => p.id));
        const toAdd = unackNew.filter(n => !prevIds.has(n.id));
        if (toAdd.length > 0) {
          return [...prev, ...toAdd];
        }
        return prev;
      });

    } catch (err: any) {
      console.error("Refresh orders failed", err);
      setError("Orders could not be refreshed. Showing the last known data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load effect to queue any existing new orders
  useEffect(() => {
    if (initialOrders.length > 0) {
      const unackNew = initialOrders.filter(o => {
        if (o.source === 'pos') return false;

        if (Array.isArray(o.items_json) && o.items_json.some((i: any) => i.is_new_addition)) {
          if (hasPerm("mark_ready") && !hasPerm("view_orders_full") && o.status !== 'preparing') return false;
          return true;
        }

        if (acknowledgedIds.current.has(o.id)) return false;

        const isKitchenOnly = hasPerm("mark_ready") && !hasPerm("view_orders_full");
        const isAdminOrCounter = hasPerm("view_orders_full");

        if (isAdminOrCounter && o.status === 'new') return true;
        return false;
      });
      if (unackNew.length > 0) {
        setQueuedNewOrders(unackNew);
      }
    }
  }, [initialOrders]);

  // Set up realtime and polling
  useEffect(() => {
    let active = true;
    void refreshOrders();

    const channel = supabase.current.channel("pabbas-orders-live-global");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      if (active) void refreshOrders();
    });
    channel.on("broadcast", { event: "orders_updated" }, () => {
      if (active) void refreshOrders();
    });

    channel.subscribe((status) => {
      if (active) {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      }
    });

    // Fallback polling (aggressive, every 5s since realtime is not active for this table)
    const poller = window.setInterval(() => {
      if (active) void refreshOrders();
    }, 5000);

    return () => {
      active = false;
      stopSound();
      window.clearInterval(poller);
      supabase.current.removeChannel(channel);
    };
  }, [refreshOrders, stopSound]);

  const acknowledgeOrder = useCallback((orderId: string, isUpdate?: boolean) => {
    if (!isUpdate) {
      acknowledgedIds.current.add(orderId);
    }
    setQueuedNewOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const updateOrderStatus = useCallback(async (order: DashboardOrder, nextStatus: OrderStatus, reason?: string, rider?: { id: string; name: string; phone: string }) => {
    // Optimistic update
    const previousStatus = order.status;
    const nextOrderState = { ...order, status: nextStatus, rider_id: rider?.id, rider_name: rider?.name, rider_phone: rider?.phone };
    setOrders(current => current.map(item => item.id === order.id ? nextOrderState : item));

    // Also remove from queue if it was in it
    acknowledgeOrder(order.id);

    const updates: any = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (rider) {
      updates.rider_id = rider.id;
      updates.rider_name = rider.name;
      updates.rider_phone = rider.phone;
    }

    if (nextStatus === "cancelled") {
      updates.cancelled_by = "staff";
      updates.cancelled_at = new Date().toISOString();
      updates.cancel_reason = `${order.status}|${reason || "staff_cancelled"}`;
    } else if (order.status === "cancelled") {
      updates.cancelled_by = null;
      updates.cancelled_at = null;
      updates.cancel_reason = null;
    }

    try {
      const { updateOrderInDb } = await import("@/lib/orders/actions");
      const result = await updateOrderInDb(order.id, updates);
      if (!result.success) throw new Error(result.error || "Failed to update order");

      // Trigger refresh but don't await it to keep UI responsive
      refreshOrders().catch(console.error);

      // Trigger Webhook
      try {
        if (previousStatus === 'new' && nextStatus === 'preparing' && order.source !== 'pos') {
          // Send order confirmation message ONLY when admin accepts
          const itemsArr = Array.isArray(order.items_json) ? order.items_json : [];
          notifyOrderCreatedWebhook({
            order_number: order.order_number,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            order_type: order.order_type,
            items: itemsArr.map((item: any) => ({
              item_name: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            total: Number(order.total)
          }).catch(console.error);
        }

        let customMessage = undefined;

        if (updates.rider_name && !order.rider_name) {
          // PHASE A: Send notification to the rider via existing n8n webhook
          const riderMessage = `🚚 *New Delivery*\n\nYou have a new delivery from Pabbas.\n\n*Order:* ${order.order_number}\n*Customer:* ${order.customer_name || "Guest"}\n*Address:* ${[order.address, order.landmark, order.city, order.pincode].filter(Boolean).join(", ") || "No address provided"}\n\n*Amount to Collect: ₹${order.total}*\n\nPlease accept the order to start the delivery.`;

          const riderNotifyResult = await notifyStatusWebhook(order.order_number, "rider_assigned", undefined, {
            target: "rider",
            rider_phone: updates.rider_phone,
            rider_name: updates.rider_name,
            whatsapp_message_text: riderMessage,
            interactive_button: "Accept Order",
            total: order.total
          });

          if (!riderNotifyResult.success) {
            console.error("Failed to notify rider via webhook:", riderNotifyResult.error);
          }
        }

        if (nextStatus === "out_for_delivery" && order.rider_name) {
          // Send the existing customer notification
          customMessage = `Good news! Your order ${order.order_number} is on its way. 🛵\n\nYour delivery partner, ${order.rider_name} (📞 ${order.rider_phone}), will be arriving soon.\n\nPlease keep ₹${order.total} in cash ready for the delivery.\n\nThank you for choosing Pabbas! We hope you enjoy your meal. 😋`;
        }

        if (nextStatus !== order.status) {
          const notifyResult = await notifyStatusWebhook(order.order_number, nextStatus, updates.cancel_reason, {
            total: order.total,
            rider_name: updates.rider_name || order.rider_name,
            rider_phone: updates.rider_phone || order.rider_phone,
            custom_message: customMessage,
            whatsapp_message_text: customMessage
          });

          if (!notifyResult.success) {
            console.error("Failed to notify customer:", notifyResult.error);
          }
        }
      } catch (notifyErr) {
        console.error("Webhook integration error:", notifyErr);
      }
    } catch (err) {
      // Revert optimistic
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status: previousStatus } : item));
      throw err;
    }
  }, [acknowledgeOrder, refreshOrders]);

  return (
    <OrderManagerContext.Provider value={{
      orders,
      queuedNewOrders,
      acknowledgeOrder,
      updateOrderStatus,
      isLoading,
      error,
      lastUpdated,
      isRealtimeConnected,
      refreshOrders,
      toggleSound,
      soundEnabled
    }}>
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" loop preload="auto" style={{ display: 'none' }} />
      {children}
    </OrderManagerContext.Provider>
  );
}
