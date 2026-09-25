"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardOrder, OrderStatus } from "@/lib/orders/queries";

const ORDER_SELECT =
  "id, order_number, customer_phone, customer_name, items, total, status, order_type, source, address, landmark, city, pincode, table_number, confirmed_at, amend_window_until, amended_at, amendment_count, original_items, cancel_reason, cancelled_by, cancelled_at, cancel_requested_at, created_at, updated_at, items_json";

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

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

const BOARD_COLUMNS: Array<{ key: "new" | "preparing" | "ready" | "delivered"; label: string; className: string }> = [
  { key: "new", label: "New", className: "new" },
  { key: "preparing", label: "Preparing", className: "preparing" },
  { key: "ready", label: "Ready / Out", className: "ready" },
  { key: "delivered", label: "Delivered", className: "delivered" },
];

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
  return summary ? [{ id: `${order.id}-summary`, name: summary, quantity: 1, unit_price: order.total }] : [];
}

function canTransitionStatus(current: OrderStatus, next: OrderStatus) {
  return (STATUS_TRANSITIONS[current] ?? []).includes(next);
}

function inRange(order: DashboardOrder, range: RangeKey) {
  const createdAt = new Date(order.created_at).getTime();
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (range === "all") return true;
  if (range === "today") return createdAt >= todayStart.getTime();
  if (range === "yesterday") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    return createdAt >= yesterdayStart.getTime() && createdAt < yesterdayEnd.getTime();
  }
  if (range === "week") {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    return createdAt >= weekStart.getTime();
  }
  if (range === "month") {
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 29);
    return createdAt >= monthStart.getTime();
  }
  return createdAt >= now - 24 * 60 * 60 * 1000;
}

function getBoardColumn(order: DashboardOrder) {
  if (order.status === "new") return "new";
  if (order.status === "preparing") return "preparing";
  if (order.status === "ready_for_pickup" || order.status === "out_for_delivery") return "ready";
  if (order.status === "delivered") return "delivered";
  return "new";
}

function getAgeMinutes(order: DashboardOrder) {
  return Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));
}

function getAgeLabel(order: DashboardOrder) {
  const minutes = getAgeMinutes(order);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  return `${hours}h ${leftoverMinutes}m`;
}

function getSlideAction(order: DashboardOrder): { label: string; nextStatus: OrderStatus; accent: string } | null {
  if (order.status === "new") {
    return { label: "Slide to accept & cook", nextStatus: "preparing", accent: "#C0392B" };
  }

  if (order.status === "preparing") {
    const nextStatus: OrderStatus = order.order_type === "delivery" ? "out_for_delivery" : "ready_for_pickup";
    return { label: "Slide to ready / out", nextStatus, accent: "#1A5FA8" };
  }

  if (order.status === "ready_for_pickup" || order.status === "out_for_delivery") {
    return { label: "Slide to delivered", nextStatus: "delivered", accent: "#5B3FBF" };
  }

  return null;
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

function printOrder(order: DashboardOrder) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) return;

  const items = buildItemList(order).map((item) => `${item.quantity} × ${item.name} — ${money(item.unit_price * item.quantity)}`).join("<br/>");
  printWindow.document.write(`
    <html>
      <head><title>${order.order_number}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px; color: #10151C;">
        <h2>${order.order_number}</h2>
        <p><strong>Customer:</strong> ${order.customer_name || "Guest"} · ${order.customer_phone}</p>
        <p><strong>Status:</strong> ${statusLabels[order.status]}</p>
        <p><strong>Total:</strong> ${money(order.total)}</p>
        <div>${items || "No items"}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function OrderCard({ order, onOpen, onStatusChange, now }: { order: DashboardOrder; onOpen: () => void; onStatusChange: (order: DashboardOrder, nextStatus: OrderStatus) => void; now: number }) {
  const items = buildItemList(order);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const slideAction = getSlideAction(order);
  const countdown = formatCountdown(order, now);
  const isAgeWarning = getAgeMinutes(order) >= 15;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="rounded-[14px] border border-[var(--line)] bg-white p-3.5 shadow-[0_2px_6px_rgba(16,21,28,0.06)] transition hover:-translate-y-0.5 hover:border-[#C9D1DB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--red)] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14.5px] font-extrabold tracking-[-0.2px] text-[var(--ink)]">{order.order_number}</div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">{order.customer_name || "Guest"} · {order.customer_phone}</div>
          <div className="mt-1 text-[12px] text-[var(--muted)]">{dateTime(order.created_at)}</div>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-extrabold text-[var(--red2)]">{money(order.total)}</div>
        </div>
      </div>

      <div className="mt-2 text-[13px] leading-5 text-[var(--ink)]">{items.length > 0 ? items.map((item) => `${item.quantity} × ${item.name}`).join(", ") : order.items || "No items listed"}</div>

      {order.order_type === "delivery" && (order.address || order.landmark || order.pincode) ? (
        <div className="mt-2 text-[12px] text-[var(--muted)]">📍 {destinationFor(order)}</div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-[6px] bg-[#F1F3F6] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] text-[var(--muted)]">{normalizeOrderType(order.order_type)}</span>
        {order.source && <span className="rounded-[6px] bg-[#F1F3F6] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] text-[var(--muted)]">{order.source}</span>}
        {Number(order.amendment_count ?? 0) > 0 && <span className="rounded-[6px] bg-[#FFEFD6] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] text-[#9A5B00]">Amended ×{order.amendment_count}</span>}
        {order.cancel_requested_at && order.status !== "cancelled" && order.status !== "delivered" && (
          <span className="rounded-[6px] border border-[#F5C6CB] bg-[#FDE8E8] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] text-[#B42318]">Cancel request</span>
        )}
        {order.status === "cancelled" && order.cancelled_by && (
          <span className="rounded-[6px] bg-[#F1F3F6] px-[7px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.3px] text-[var(--muted)]">By {String(order.cancelled_by).replace(/^staff:/, "")}</span>
        )}
        <span className={`ml-auto text-[11.5px] font-bold ${countdown.isOverdue ? "text-[var(--danger)]" : isAgeWarning ? "text-[var(--warn)]" : "text-[var(--muted)]"}`}>{countdown.label}</span>
      </div>

      {slideAction && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onStatusChange(order, slideAction.nextStatus);
          }}
          className="relative mt-3 h-[42px] w-full overflow-hidden rounded-[10px] border border-[var(--line)] bg-[#F1F3F6] text-left"
          aria-label={`Move order ${order.order_number} to ${statusLabels[slideAction.nextStatus]}`}
        >
          <span className="absolute inset-y-0 left-0 w-[64%] rounded-r-[8px] opacity-20" style={{ background: slideAction.accent }} />
          <span className="absolute inset-0 grid place-items-center px-3 text-[12.5px] font-bold text-[var(--muted)]">{slideAction.label}</span>
          <span className="absolute top-[3px] left-[3px] grid h-[34px] w-[50px] place-items-center rounded-[8px] text-xl font-extrabold text-white" style={{ background: slideAction.accent }}>›</span>
        </button>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {order.status === "preparing" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStatusChange(order, order.order_type === "delivery" ? "out_for_delivery" : "ready_for_pickup");
            }}
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-[12px] font-semibold text-[var(--muted)]"
          >
            Ready for pickup
          </button>
        )}
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStatusChange(order, "cancelled");
            }}
            className="rounded-lg border border-[#F5C6CB] bg-[var(--tint)] px-2 py-1.5 text-[12px] font-semibold text-[var(--red2)]"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            printOrder(order);
          }}
          className="ml-auto rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-[12px] font-semibold text-[var(--muted)]"
        >
          Print
        </button>
      </div>

      <div className="mt-2 text-[11px] text-[var(--muted)]">{itemCount} item{itemCount === 1 ? "" : "s"} · {getAgeLabel(order)} old</div>
    </div>
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
  const [range, setRange] = useState<RangeKey>("today");
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);
  const [alertOrder, setAlertOrder] = useState<DashboardOrder | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cancelledOpen, setCancelledOpen] = useState(false);

  const supabase = useRef(createClient());
  const knownIdsRef = useRef(new Set(initialOrders.map((order) => order.id)));
  const alertSeenRef = useRef(new Set<string>());
  const initialLoadCompleteRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundTimerRef = useRef<number | null>(null);
  const soundEnabledRef = useRef(false);

  const stopSound = useCallback(() => {
    if (soundTimerRef.current) {
      window.clearInterval(soundTimerRef.current);
      soundTimerRef.current = null;
    }
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
    const handleRefreshRequest = () => {
      void refreshOrders();
    };

    const handleSoundToggle = () => {
      setSoundEnabled((current) => {
        const next = !current;
        if (next) {
          startSound();
        } else {
          stopSound();
        }
        return next;
      });
    };

    window.addEventListener("pabbas-refresh-orders", handleRefreshRequest);
    window.addEventListener("pabbas-toggle-sound", handleSoundToggle);

    const channel = supabase.current.channel("pabbas-orders-live");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      void refreshOrders();
    });

    void channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        setError("Realtime connection lost. Polling fallback is active.");
      }
    });

    const poller = window.setInterval(() => {
      void refreshOrders();
    }, 5000);

    return () => {
      window.removeEventListener("pabbas-refresh-orders", handleRefreshRequest);
      window.removeEventListener("pabbas-toggle-sound", handleSoundToggle);
      window.clearInterval(poller);
      supabase.current.removeChannel(channel);
      stopSound();
    };
  }, [refreshOrders, startSound, stopSound]);

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
      const { error: updateError } = await ordersTable.update(updates).eq("id", order.id);
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
      const matchesRange = inRange(order, range);
      const matchesSearch = !query || [order.order_number, order.customer_name || "", order.customer_phone].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === "all" || order.status === status;
      const matchesType = orderType === "all" || order.order_type === orderType;
      return matchesRange && matchesSearch && matchesStatus && matchesType;
    });
  }, [orderType, orders, range, search, status]);

  const visibleOrders = filteredOrders.filter((order) => order.status !== "cancelled");
  const cancelledOrders = filteredOrders.filter((order) => order.status === "cancelled");

  const totalRevenue = visibleOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const awaitingAccept = visibleOrders.filter((order) => getBoardColumn(order) === "new").length;
  const inTheKitchen = visibleOrders.filter((order) => order.status === "preparing").length;
  const totalOrderCount = visibleOrders.length;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-extrabold uppercase tracking-[0.3px] text-[var(--muted)]">Filter:</span>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={range === option.key}
                onClick={() => setRange(option.key)}
                className={`rounded-full border px-4 py-2 text-[13px] font-bold transition ${
                  range === option.key
                    ? "border-[var(--red)] bg-[var(--red)] text-white shadow-[0_8px_20px_rgba(226,55,68,0.18)]"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[#CBD3DC]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order, name or phone"
            className="min-w-[220px] rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--red)]"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | OrderStatus)}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--red)]"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value as "all" | DashboardOrder["order_type"])}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--red)]"
          >
            <option value="all">All types</option>
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
            <option value="dine-in">Dine-in</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(totalRevenue)} tone="red" />
        <StatCard label="Total Orders" value={String(totalOrderCount)} tone="blue" />
        <StatCard label="Awaiting Accept" value={String(awaitingAccept)} tone="purple" />
        <StatCard label="In The Kitchen" value={String(inTheKitchen)} tone="amber" />
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]">
          {statusMessage}
        </div>
      )}

      {error && <div className="rounded-xl border border-[#F5C6CB] bg-[var(--tint)] px-4 py-3 text-sm font-semibold text-[var(--red2)]">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const columnOrders = visibleOrders.filter((order) => getBoardColumn(order) === column.key);
          return (
            <div key={column.key} className={`min-w-0 rounded-[14px] ${column.key === "new" ? "bg-[#FFF0F1]" : column.key === "preparing" ? "bg-[#EAF3FF]" : column.key === "ready" ? "bg-[#F2EEFF]" : "bg-[#EAF8EF]"} p-3`}>
              <div className="mb-3 flex items-center justify-between gap-2 rounded-[12px] border border-transparent px-1 py-1">
                <div className="text-[16px] font-extrabold tracking-[-0.2px] text-[var(--ink)]">{column.label}</div>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/80 px-1.5 text-[12px] font-bold text-[var(--muted)]">{columnOrders.length}</span>
              </div>

              <div className="space-y-3">
                {columnOrders.length > 0 ? (
                  columnOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onOpen={() => setSelectedOrder(order)} onStatusChange={handleStatusChange} now={now} />
                  ))
                ) : (
                  <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-white/60 px-3 py-8 text-center text-[12px] text-[var(--muted)]">Nothing here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setCancelledOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[14px] font-bold text-[var(--muted)]"
        >
          <span>Cancelled</span>
          <span>{cancelledOrders.length} {cancelledOpen ? "▴" : "▾"}</span>
        </button>
        {cancelledOpen && (
          <div className="border-t border-[var(--line)] p-3">
            {cancelledOrders.length > 0 ? (
              <div className="space-y-3">
                {cancelledOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onOpen={() => setSelectedOrder(order)} onStatusChange={handleStatusChange} now={now} />
                ))}
              </div>
            ) : (
              <div className="rounded-[12px] border border-dashed border-[var(--line)] bg-[#F8FAFB] px-3 py-8 text-center text-[12px] text-[var(--muted)]">None</div>
            )}
          </div>
        )}
      </div>

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
            void startSound();
          }}
          soundEnabled={soundEnabled}
          audioBlocked={audioBlocked}
          now={now}
        />
      )}
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "red" | "blue" | "purple" | "amber" }) {
  const toneClasses = {
    red: "text-[var(--red)]",
    blue: "text-[#1A5FA8]",
    purple: "text-[#5B3FBF]",
    amber: "text-[#B8730B]",
  }[tone];

  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-white p-5 shadow-[0_1px_3px_rgba(16,21,28,0.05)]">
      <span className="mb-3 block text-[12px] font-extrabold uppercase tracking-[1.3px] text-[var(--muted)]">{label}</span>
      <b className={`block text-[40px] font-extrabold leading-none tracking-[-1.5px] ${toneClasses}`}>{value}</b>
    </div>
  );
}
