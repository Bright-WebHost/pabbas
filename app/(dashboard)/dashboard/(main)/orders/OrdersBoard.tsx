"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardOrder, OrderStatus } from "@/lib/orders/queries";

const ORDER_SELECT =
  "id, order_number, customer_phone, customer_name, items, total, status, order_type, source, address, landmark, city, pincode, table_number, confirmed_at, amend_window_until, amended_at, amendment_count, original_items, cancel_reason, cancelled_by, cancelled_at, cancel_requested_at, created_at, updated_at, items_json";

const statusLabels: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready_for_pickup: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusStyles: Record<OrderStatus, string> = {
  new: "bg-[#FFF7E6] text-[#9A6700] border-[#F3D28B]",
  preparing: "bg-[var(--c-prep)] text-[var(--c-prep-t)] border-[var(--c-prep-b)]",
  ready_for_pickup: "bg-[var(--c-ready)] text-[var(--c-ready-t)] border-[var(--c-ready-b)]",
  out_for_delivery: "bg-[var(--c-ready)] text-[var(--c-ready-t)] border-[var(--c-ready-b)]",
  delivered: "bg-[var(--c-done)] text-[var(--c-done-t)] border-[var(--c-done-b)]",
  cancelled: "bg-[#F3F4F6] text-[#667085] border-[#D0D5DD]",
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const dateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const durationText = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatCountdown = (order: DashboardOrder, now: number) => {
  const createdAtMs = new Date(order.created_at).getTime();
  const remaining = FIFTEEN_MINUTES_MS - (now - createdAtMs);

  if (remaining <= 0) {
    const elapsed = now - createdAtMs - FIFTEEN_MINUTES_MS;
    return {
      isOverdue: true,
      label: `OVERDUE +${durationText(elapsed)}`,
      seconds: remaining,
    };
  }

  return {
    isOverdue: false,
    label: durationText(remaining),
    seconds: remaining,
  };
};

function normalizeOrderType(value: string | null | undefined) {
  if (value === "dine-in") return "Dine-in";
  if (value === "takeaway" || value === "pickup") return "Pickup";
  return "Delivery";
}

function destinationFor(order: DashboardOrder) {
  if (order.order_type === "delivery") {
    return [order.address, order.landmark, order.pincode].filter(Boolean).join(", ") || "Address not provided";
  }
  if (order.order_type === "dine-in") return `Table ${order.table_number ?? "assigned"}`;
  return "Pickup";
}

function buildItemList(order: DashboardOrder) {
  if (Array.isArray(order.items_json) && order.items_json.length > 0) {
    return order.items_json.map((item) => ({
      id: `${order.id}-${item.menu_item_id ?? item.item_name}`,
      name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));
  }

  const summary = order.items || "";
  return summary
    ? [{ id: `${order.id}-summary`, name: summary, quantity: 1, unit_price: order.total }]
    : [];
}

function canTransitionStatus(current: OrderStatus, next: OrderStatus) {
  return (STATUS_TRANSITIONS[current] ?? []).includes(next);
}

async function fetchDashboardOrders() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return (data ?? []) as DashboardOrder[];
}

function OrderDetails({ order, onClose, now, onStatusChange }: { order: DashboardOrder; onClose: () => void; now: number; onStatusChange: (order: DashboardOrder, nextStatus: OrderStatus) => void }) {
  const items = buildItemList(order);
  const countdown = formatCountdown(order, now);
  const actions = STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#10151C]/45 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={`Details for ${order.order_number}`}
        aria-modal="true"
        role="dialog"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--red2)]">Order details</p>
            <h2 className="mt-1 text-xl font-extrabold">{order.order_number}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Created {dateTime(order.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]" aria-label="Close order details">
            Close
          </button>
        </div>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <InfoBlock label="Customer" value={`${order.customer_name || "Guest"} · ${order.customer_phone}`} />
          <InfoBlock label="Status" value={statusLabels[order.status]} />
          <InfoBlock label="Type" value={normalizeOrderType(order.order_type)} />
          <InfoBlock label="Countdown" value={countdown.label} />
          <InfoBlock label="Received" value={dateTime(order.created_at)} />
          <InfoBlock label="Updated" value={dateTime(order.updated_at)} />
          <InfoBlock label="Confirmed" value={dateTime(order.confirmed_at)} />
          <InfoBlock label="Amend window" value={dateTime(order.amend_window_until)} />
          <InfoBlock label="Amended" value={dateTime(order.amended_at)} />
          <InfoBlock label="Amendments" value={String(order.amendment_count ?? 0)} />
          <InfoBlock label="Address" value={[order.address, order.landmark, order.city, order.pincode].filter(Boolean).join(", ") || "—"} />
          <InfoBlock label="Table" value={order.table_number || "—"} />
          <InfoBlock label="Cancellation reason" value={order.cancel_reason || "—"} />
          <InfoBlock label="Cancelled by" value={order.cancelled_by || "—"} />
          <InfoBlock label="Cancelled at" value={dateTime(order.cancelled_at)} />
          <InfoBlock label="Cancel requested" value={dateTime(order.cancel_requested_at)} />
        </div>

        <div className="border-t border-[var(--line)] pt-4">
          <h3 className="text-sm font-extrabold">Items</h3>
          <div className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
            {items.length > 0 ? items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 p-3 text-sm">
                <div>
                  <p className="font-bold">{item.quantity} × {item.name}</p>
                </div>
                <p className="shrink-0 font-bold">{money(item.unit_price * item.quantity)}</p>
              </div>
            )) : <p className="p-3 text-sm text-[var(--muted)]">Items unavailable.</p>}
          </div>
          <div className="mt-3 flex items-center justify-between text-base font-extrabold">
            <span>Total</span>
            <span className="text-[var(--red2)]">{money(order.total)}</span>
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="text-sm font-extrabold">Status actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.length > 0 ? actions.map((nextStatus) => (
              <button
                key={nextStatus}
                type="button"
                onClick={() => onStatusChange(order, nextStatus)}
                className="rounded-lg bg-[var(--red)] px-3 py-2 text-xs font-bold text-white"
              >
                {`Move to ${statusLabels[nextStatus]}`}
              </button>
            )) : <span className="text-sm text-[var(--muted)]">No further status transitions available.</span>}
            {order.status !== "cancelled" && order.status !== "delivered" && (
              <button
                type="button"
                onClick={() => onStatusChange(order, "cancelled")}
                className="rounded-lg border border-[#F5C6CB] bg-[var(--tint)] px-3 py-2 text-xs font-bold text-[var(--red2)]"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}

function OrderCard({ order, onOpen, now }: { order: DashboardOrder; onOpen: () => void; now: number }) {
  const items = buildItemList(order);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const countdown = formatCountdown(order, now);

  return (
    <button type="button" onClick={onOpen} className="w-full rounded-xl border border-[var(--line)] bg-white p-4 text-left shadow-[0_2px_8px_rgba(16,21,28,0.04)] transition hover:-translate-y-0.5 hover:border-[#C9D1DB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--red)] focus:ring-offset-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-[var(--ink)]">{order.order_number}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">{dateTime(order.created_at)}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[order.status]}`}>
          {statusLabels[order.status]}
        </span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 border-t border-[var(--line)] pt-3">
        <div>
          <p className="text-sm font-bold">{order.customer_name || "Guest"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{normalizeOrderType(order.order_type)} · {itemCount} item{itemCount === 1 ? "" : "s"}</p>
        </div>
        <p className="text-base font-extrabold text-[var(--red2)]">{money(order.total)}</p>
      </div>
      <p className="mt-3 truncate text-xs text-[var(--muted)]">{destinationFor(order)}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold">
        <span className={countdown.isOverdue ? "text-red-600" : "text-[var(--red2)]"}>{countdown.label}</span>
        <span className="text-[var(--muted)]">View details →</span>
      </div>
    </button>
  );
}

function NewOrderPopup({ order, onAcknowledge, onEnableSound, soundEnabled, audioBlocked, now }: { order: DashboardOrder; onAcknowledge: () => void; onEnableSound: () => void; soundEnabled: boolean; audioBlocked: boolean; now: number }) {
  const countdown = formatCountdown(order, now);
  const items = buildItemList(order);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#10151C]/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#F1D7B5] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--red2)]">New incoming order</p>
            <h3 className="mt-2 text-2xl font-extrabold">{order.order_number}</h3>
          </div>
          <span className="rounded-full bg-[#FFF7E6] px-3 py-1 text-xs font-bold text-[#9A6700]">{statusLabels[order.status]}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoBlock label="Customer" value={`${order.customer_name || "Guest"} · ${order.customer_phone}`} />
          <InfoBlock label="Type" value={normalizeOrderType(order.order_type)} />
          <InfoBlock label="Total" value={money(order.total)} />
          <InfoBlock label="Countdown" value={countdown.label} />
          <InfoBlock label="Received" value={dateTime(order.created_at)} />
          <InfoBlock label="Address" value={[order.address, order.landmark, order.pincode].filter(Boolean).join(", ") || order.table_number || "—"} />
        </div>

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[#FBFCFD] p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Items</p>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <span>{item.quantity} × {item.name}</span>
                <span className="font-bold">{money(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--line)] bg-[#F8FAFB] p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              <span>Staff acknowledgment</span>
              {!soundEnabled && <button type="button" onClick={onEnableSound} className="text-[var(--red2)] underline">Enable sound</button>}
            </div>
            <button
              type="button"
              onClick={onAcknowledge}
              className="flex w-full items-center justify-center rounded-xl bg-[var(--red)] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(226,55,68,0.28)]"
            >
              Acknowledge order
            </button>
          </div>
          {audioBlocked && (
            <div className="rounded-xl border border-[#F5C6CB] bg-[var(--tint)] px-3 py-2 text-xs font-semibold text-[var(--red2)]">
              Browser audio was blocked. Use “Enable sound” to start the alert for this order.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersBoard({ orders: initialOrders, error: initialError }: { orders: DashboardOrder[]; error: string | null }) {
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [error, setError] = useState<string | null>(initialError);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [orderType, setOrderType] = useState<"all" | DashboardOrder["order_type"]>("all");
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);
  const [alertOrder, setAlertOrder] = useState<DashboardOrder | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const supabase = useRef(createClient());
  const knownIdsRef = useRef(new Set(initialOrders.map((order) => order.id)));
  const alertSeenRef = useRef(new Set<string>());
  const initialLoadCompleteRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundTimerRef = useRef<number | null>(null);
  const activeAlertIdRef = useRef<string | null>(null);
  const soundEnabledRef = useRef(false);

  const stopSound = useCallback(() => {
    if (soundTimerRef.current) {
      window.clearInterval(soundTimerRef.current);
      soundTimerRef.current = null;
    }
    activeAlertIdRef.current = null;
    soundEnabledRef.current = false;
    setSoundEnabled(false);
  }, []);

  const startSound = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      if (!audioCtxRef.current) {
        const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) {
          setAudioBlocked(true);
          return;
        }
        audioCtxRef.current = new AudioCtor();
      }

      if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }

      soundEnabledRef.current = true;
      setSoundEnabled(true);
      setAudioBlocked(false);
      if (soundTimerRef.current) {
        window.clearInterval(soundTimerRef.current);
      }

      const beep = () => {
        if (!audioCtxRef.current || !soundEnabledRef.current) return;
        const oscillator = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioCtxRef.current.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.3);
        oscillator.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        oscillator.start();
        oscillator.stop(audioCtxRef.current.currentTime + 0.32);
      };

      beep();
      soundTimerRef.current = window.setInterval(beep, 1800);
    } catch {
      setAudioBlocked(true);
      soundEnabledRef.current = false;
      setSoundEnabled(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(() => {
    if (!alertOrder) return;
    stopSound();
    setAlertOrder(null);
  }, [alertOrder, stopSound]);

  const enableSound = useCallback(async () => {
    setSoundEnabled(true);
    startSound();
  }, [startSound]);

  const refreshOrders = useCallback(async () => {
    try {
      const latestOrders = await fetchDashboardOrders();
      setOrders(latestOrders);
      setError(null);

      if (!initialLoadCompleteRef.current) {
        knownIdsRef.current = new Set(latestOrders.map((order) => order.id));
        initialLoadCompleteRef.current = true;
        return;
      }

      const newOrders = latestOrders.filter((order) => !knownIdsRef.current.has(order.id));
      if (newOrders.length > 0) {
        const newestOrder = newOrders[0];
        const dedupeKey = newestOrder.id || newestOrder.order_number;
        if (!alertSeenRef.current.has(dedupeKey)) {
          alertSeenRef.current.add(dedupeKey);
          activeAlertIdRef.current = newestOrder.id;
          setAlertOrder(newestOrder);
          startSound();
        }
      }

      knownIdsRef.current = new Set(latestOrders.map((order) => order.id));
    } catch {
      setError("Orders could not be refreshed. Showing the last known data.");
    }
  }, [startSound]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    const channel = supabase.current.channel("pabbas-orders-live");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        void refreshOrders();
      }
    );

    void channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        setError("Realtime connection lost. Polling fallback is active.");
      }
    });

    const poller = window.setInterval(() => {
      void refreshOrders();
    }, 5000);

    return () => {
      window.clearInterval(poller);
      supabase.current.removeChannel(channel);
      stopSound();
    };
  }, [refreshOrders, stopSound]);

  const handleStatusChange = useCallback(async (order: DashboardOrder, nextStatus: OrderStatus) => {
    if (!canTransitionStatus(order.status, nextStatus)) {
      setStatusMessage(`Invalid update: ${statusLabels[order.status]} → ${statusLabels[nextStatus]}.`);
      return;
    }

    const previousStatus = order.status;
    const nextOrderState = { ...order, status: nextStatus };
    setOrders((current) => current.map((item) => (item.id === order.id ? nextOrderState : item)));

    const updates: any = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (nextStatus === "cancelled") {
      updates.cancelled_by = "staff";
      updates.cancelled_at = new Date().toISOString();
      updates.cancel_reason = "staff_cancelled";
    }

    try {
      const ordersTable: any = supabase.current.from("orders");
      const { error: updateError } = await ordersTable
        .update(updates)
        .eq("id", order.id);

      if (updateError) {
        throw updateError;
      }

      setStatusMessage(`Order ${order.order_number} updated to ${statusLabels[nextStatus]}.`);
      setSelectedOrder(null);
      await refreshOrders();
    } catch {
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status: previousStatus } : item)));
      setStatusMessage(`Failed to update order ${order.order_number}.`);
    }
  }, [refreshOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !query || [order.order_number, order.customer_name || "", order.customer_phone].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (status === "all" || order.status === status) && (orderType === "all" || order.order_type === orderType);
    });
  }, [orderType, orders, search, status]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--red2)]">Live production view</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Orders</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Orders grouped by live status and updated from the current database.</p>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
          {filteredOrders.length} of {orders.length} loaded
        </span>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]">
          {statusMessage}
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-3 sm:grid-cols-[minmax(220px,1fr)_160px_160px_auto]">
        <label className="sr-only" htmlFor="order-search">Search orders</label>
        <input id="order-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, name, or phone" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--red)]" />
        <label className="sr-only" htmlFor="status-filter">Filter by status</label>
        <select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value as "all" | OrderStatus)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--red)]">
          <option value="all">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label className="sr-only" htmlFor="type-filter">Filter by order type</label>
        <select id="type-filter" value={orderType} onChange={(event) => setOrderType(event.target.value as "all" | DashboardOrder["order_type"])} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[var(--red)]">
          <option value="all">All types</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
          <option value="dine-in">Dine-in</option>
        </select>
        <button type="button" onClick={() => { setSearch(""); setStatus("all"); setOrderType("all"); }} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]">Clear</button>
      </div>

      {error && <div className="rounded-xl border border-[#F5C6CB] bg-[var(--tint)] px-4 py-3 text-sm font-semibold text-[var(--red2)]">{error}</div>}
      {!error && orders.length === 0 && <div className="rounded-xl border border-dashed border-[var(--line)] bg-white px-5 py-12 text-center text-sm text-[var(--muted)]">No production orders are available.</div>}
      {!error && orders.length > 0 && filteredOrders.length === 0 && <div className="rounded-xl border border-dashed border-[var(--line)] bg-white px-5 py-12 text-center text-sm text-[var(--muted)]">No orders match these filters.</div>}

      {filteredOrders.length > 0 && <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-3 2xl:grid-cols-6">
        {(Object.keys(statusLabels) as OrderStatus[]).map((columnStatus) => {
          const statusOrders = filteredOrders.filter((order) => order.status === columnStatus);
          return <section key={columnStatus} className="min-w-[280px] rounded-xl border border-[var(--line)] bg-[#F8FAFB] p-3">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold">{statusLabels[columnStatus]}</h3><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-[var(--muted)]">{statusOrders.length}</span></div>
            <div className="space-y-3">{statusOrders.length > 0 ? statusOrders.map((order) => <OrderCard key={order.id} order={order} onOpen={() => setSelectedOrder(order)} now={now} />) : <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-5 text-center text-xs text-[var(--muted)]">No orders</p>}</div>
          </section>;
        })}
      </div>}

      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          now={now}
          onStatusChange={handleStatusChange}
        />
      )}

      {alertOrder && (
        <NewOrderPopup
          order={alertOrder}
          onAcknowledge={() => {
            stopSound();
            setAlertOrder(null);
          }}
          onEnableSound={() => {
            void enableSound();
          }}
          soundEnabled={soundEnabled}
          audioBlocked={audioBlocked}
          now={now}
        />
      )}
    </section>
  );
}