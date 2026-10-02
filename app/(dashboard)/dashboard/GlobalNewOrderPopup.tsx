"use client";

import React, { useState, useEffect } from "react";
import { useOrderManager } from "./OrderManagerProvider";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { DashboardOrder } from "@/lib/orders/queries";

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
    return order.items_json.map((item: any) => ({
      id: `${order.id}-${item.menu_item_id ?? (item.item_name || item.name)}`,
      name: item.item_name || item.name,
      quantity: item.quantity,
      unit_price: item.unit_price ?? item.price,
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

function SlideToAcknowledge({ onAcknowledge }: { onAcknowledge: () => void }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 200], [1, 0]);
  const bg = useTransform(x, [0, 250], ["#e23744", "#34C759"]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 200) {
      onAcknowledge();
    }
  };

  return (
    <div className="relative flex h-14 w-full items-center overflow-hidden rounded-xl bg-[#F8FAFB] border border-[#e2e8f0]">
      <motion.div className="absolute inset-0 z-0" style={{ backgroundColor: bg as any, opacity: 0.1 }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.span style={{ opacity }} className="text-sm font-extrabold uppercase tracking-widest text-[#e23744]">
          Slide to Acknowledge
        </motion.span>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 260 }}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        className="relative z-10 flex h-full w-16 cursor-grab items-center justify-center rounded-xl bg-[var(--red)] shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 17 18 12 13 7"></polyline>
          <polyline points="6 17 11 12 6 7"></polyline>
        </svg>
      </motion.div>
    </div>
  );
}

export function GlobalNewOrderPopup() {
  const { queuedNewOrders, acknowledgeOrder } = useOrderManager();
  const [now, setNow] = useState(Date.now());

  const newOrder = queuedNewOrders.length > 0 ? queuedNewOrders[0] : null;

  useEffect(() => {
    if (!newOrder) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [newOrder]);

  if (!newOrder) return null;

  const countdown = formatCountdown(newOrder, now);
  const items = buildItemList(newOrder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10151C]/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#F1D7B5] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--red2)]">New incoming order</p>
            <h3 className="mt-2 text-2xl font-extrabold">{newOrder.order_number}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
             <span className="rounded-full bg-[#FFF7E6] px-3 py-1 text-xs font-bold text-[#9A6700]">{statusLabels[newOrder.status] || "New"}</span>
             {queuedNewOrders.length > 1 && (
               <span className="text-xs font-bold text-[var(--red2)]">+{queuedNewOrders.length - 1} more in queue</span>
             )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoBlock label="Customer" value={`${newOrder.customer_name || "Guest"} · ${newOrder.customer_phone}`} />
          <InfoBlock label="Type" value={normalizeOrderType(newOrder.order_type)} />
          <InfoBlock label="Total" value={money(newOrder.total)} />
          <InfoBlock label="Countdown" value={countdown.label} />
          <InfoBlock label="Received" value={dateTime(newOrder.created_at)} />
          <InfoBlock label="Address" value={[newOrder.address, newOrder.landmark, newOrder.pincode].filter(Boolean).join(", ") || newOrder.table_number || "—"} />
        </div>

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[#FBFCFD] p-3 max-h-48 overflow-y-auto">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Items</p>
          <div className="space-y-2 text-sm">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <span>{item.quantity} × {item.name}</span>
                <span className="font-bold">{money(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SlideToAcknowledge onAcknowledge={() => acknowledgeOrder(newOrder.id)} />
        </div>
      </div>
    </div>
  );
}
