"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOrderManager } from "./OrderManagerProvider";
import { DashboardOrder } from "@/lib/orders/queries";
import { SlideAction } from "@/components/dashboard/ui/SlideAction";

const statusLabels: Record<string, string> = {
  new: "New Order",
  preparing: "Preparing",
  ready_for_pickup: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function normalizeOrderType(t: string | null | undefined) {
  if (!t) return "Unknown";
  if (t.toLowerCase() === "pwa") return "Takeaway";
  return t.charAt(0).toUpperCase() + t.slice(1).replace("-", " ");
}

function money(val: string | number | undefined) {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
}

function dateTime(str: string | null | undefined) {
  if (!str) return "—";
  try {
    const d = new Date(str);
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return "Invalid date";
  }
}

function formatCountdown(order: DashboardOrder, now: number) {
  if (order.status === "ready_for_pickup" || order.status === "delivered" || order.status === "cancelled") {
    return { label: "Completed", style: "completed" };
  }
  const created = new Date(order.created_at).getTime();
  const diff = now - created;
  const fifteenMin = 15 * 60 * 1000;
  const remaining = fifteenMin - diff;

  if (remaining < 0) {
    const overdueMins = Math.floor(Math.abs(remaining) / 60000);
    return { label: `OVERDUE +${overdueMins}m`, style: "overdue" };
  }
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const style = m < 5 ? "warning" : "normal";
  return { label: `${m}:${s.toString().padStart(2, "0")}`, style };
}

function buildItemList(order: DashboardOrder) {
  if (Array.isArray(order.items_json) && order.items_json.length > 0) {
    return order.items_json.map((item: any, idx: number) => ({
      id: `${order.id}-${item.menu_item_id ?? (item.item_name || item.name)}-${idx}`,
      name: item.item_name || item.name,
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.price,
      is_new_addition: item.is_new_addition,
      old_quantity: item.old_quantity,
      round: item.round
    }));
  }
  const summary = order.items || "";
  return summary ? [{ id: `${order.id}-summary`, name: summary, quantity: 1, unit_price: order.total }] : [];
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}


export function GlobalNewOrderPopup() {
  const pathname = usePathname();
  const { queuedNewOrders, acknowledgeOrder, updateOrderStatus } = useOrderManager();
  const [now, setNow] = useState(Date.now());
  const [prepTime, setPrepTime] = useState<number>(15);

  const newOrder = queuedNewOrders.length > 0 ? queuedNewOrders[0] : null;

  useEffect(() => {
    if (!newOrder) return;
    setPrepTime(15); // Reset prep time for each new order
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [newOrder]);
  if (!newOrder || pathname === '/dashboard/pos') return null;
  const countdown = formatCountdown(newOrder, now);
  const items = buildItemList(newOrder);
  const PREP_TIMES = [15, 30, 45, 60];

  const isUpdate = newOrder && Array.isArray(newOrder.items_json) && newOrder.items_json.some((i: any) => i.is_new_addition);

  const handleAccept = async () => {
    try {
      if (newOrder.status === 'new') {
        await updateOrderStatus(newOrder, "preparing");
      } else if (isUpdate && newOrder.items_json) {
        // Clear is_new_addition flag in the database so it doesn't pop up again on refresh
        const clearedItems = (newOrder.items_json as any[]).map((i: any) => ({ ...i, is_new_addition: false, old_quantity: i.quantity }));
        const supabase = (await import("@/lib/supabase/client")).createClient() as any;
        await supabase.from("orders").update({ items_json: clearedItems }).eq("id", newOrder.id);
      }
    } catch (e) {
      console.error(e);
    }
    acknowledgeOrder(newOrder.id, isUpdate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111A26]/80 p-4 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-2xl rounded-[20px] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--line)] pb-5">
          <div className="flex flex-col">
            <span className="text-[12px] font-extrabold tracking-[2px] uppercase text-[#C0392B] mb-1">
              {isUpdate ? "🚨 Updated Order Items" : "New Incoming Order"}
            </span>
            <h2 className="text-[32px] leading-none font-extrabold tracking-[-1px] text-[var(--ink)] flex items-center gap-3">
              {newOrder.order_number}
              {newOrder.table_number && (
                <span className="px-3 py-1 bg-[#0A1017] text-white rounded font-black text-[16px] tracking-wide uppercase mt-1">
                  {newOrder.table_number.toLowerCase().includes('table') ? newOrder.table_number : `Table ${newOrder.table_number}`}
                </span>
              )}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#FFF7E6] border border-[#F3D28B] px-3 py-1.5 text-[13px] font-bold text-[#9A6700]">
                {normalizeOrderType(newOrder.order_type)}
              </span>
            </div>
            {queuedNewOrders.length > 1 && (
              <span className="rounded-full bg-[#FFF0F1] border border-[#F5C2C6] px-3 py-1 text-[12px] font-bold text-[#C0392B]">
                +{queuedNewOrders.length - 1} more in queue
              </span>
            )}
          </div>
        </div>

        {/* Customer & Order Info */}
        <div className="grid grid-cols-2 gap-6 py-5 border-b border-[var(--line)] shrink-0">
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)] mb-1">Customer</span>
            <span className="text-[15px] font-bold text-[var(--ink)]">{newOrder.customer_name || "Guest"}</span>
            <span className="text-[14px] font-medium text-[var(--muted)]">{newOrder.customer_phone}</span>
          </div>
          
          <div className="flex flex-col items-end text-right">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)] mb-1">Total Amount</span>
            <span className="text-[24px] leading-none font-extrabold text-[var(--red2)]">{money(newOrder.total)}</span>
            <span className="text-[13px] font-bold text-[var(--muted)] mt-1">
              Received {dateTime(newOrder.created_at).split(", ")[1]}
            </span>
          </div>
          
          {(newOrder.order_type === "delivery" && (newOrder.address || newOrder.landmark || newOrder.pincode)) && (
            <div className="col-span-2 bg-[#F8FAFB] p-3 rounded-xl border border-[var(--line)]">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)] block mb-1">Delivery Address</span>
              <span className="text-[14px] font-medium text-[var(--ink)]">📍 {[newOrder.address, newOrder.landmark, newOrder.pincode].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 min-h-[120px] overflow-y-auto py-5">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)] block mb-3">Order Items</span>
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className={`flex justify-between items-start p-3 border rounded-xl ${item.is_new_addition ? "bg-[#FFF8E6] border-[#F2C94C]" : "bg-[#F8FAFB] border-[var(--line)]"}`}>
                <div className="flex gap-3">
                  <span className={`font-extrabold text-[15px] w-[24px] ${item.is_new_addition ? "text-[#D97706]" : "text-[var(--ink)]"}`}>{item.quantity}×</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] text-[var(--ink)]">
                      {item.name} {item.round > 1 && <span className="text-[12px] text-[var(--muted)] ml-1">(Round {item.round})</span>}
                    </span>
                    {item.is_new_addition && (
                      <span className="text-[11px] font-extrabold text-[#D97706] mt-1 uppercase tracking-widest bg-[#FEF3C7] px-2 py-0.5 rounded-md inline-block w-fit">
                        {item.old_quantity > 0 ? `+${item.quantity - item.old_quantity} Added` : 'New Item'}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-bold text-[15px] text-[var(--ink)]">{money(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions (Prep Time & Slide) */}
        <div className="pt-5 border-t border-[var(--line)] shrink-0 bg-white">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)] block mb-3 text-center">
            Select Preparation Time
          </span>
          <div className="flex gap-2 justify-center mb-6">
            {PREP_TIMES.map(time => (
              <button
                key={time}
                onClick={() => setPrepTime(time)}
                className={`w-[60px] h-[48px] rounded-[12px] font-extrabold text-[15px] transition-all
                  ${prepTime === time 
                    ? "bg-[#C0392B] text-white shadow-[0_4px_12px_rgba(192,57,43,0.3)] border-transparent" 
                    : "bg-white text-[var(--ink)] border border-[var(--line)] hover:border-[#C0392B] hover:text-[#C0392B]"
                  }`}
              >
                {time}m
              </button>
            ))}
          </div>

          <SlideAction
            label={isUpdate ? "Acknowledge Update" : "Slide to Accept & Cook"}
            baseColor="#F8FAFB"
            accentColor={isUpdate ? "#D97706" : "#C0392B"}
            onAcknowledge={handleAccept}
          />
        </div>

      </div>
    </div>
  );
}
