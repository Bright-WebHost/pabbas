"use client";

import { useMemo, useState } from "react";
import type { DashboardOrder, OrderStatus } from "@/lib/orders/queries";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-[#FFF7E6] text-[#9A6700] border-[#F3D28B]",
  confirmed: "bg-[var(--tint)] text-[var(--red2)] border-[#F5C6CB]",
  preparing: "bg-[var(--c-prep)] text-[var(--c-prep-t)] border-[var(--c-prep-b)]",
  ready: "bg-[var(--c-ready)] text-[var(--c-ready-t)] border-[var(--c-ready-b)]",
  completed: "bg-[var(--c-done)] text-[var(--c-done-t)] border-[var(--c-done-b)]",
  cancelled: "bg-[#F3F4F6] text-[#667085] border-[#D0D5DD]",
};

const money = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function destinationFor(order: DashboardOrder) {
  if (order.order_type === "delivery") {
    return [order.delivery_address_snapshot, order.landmark_snapshot, order.pincode_snapshot]
      .filter(Boolean)
      .join(", ") || "Address not provided";
  }
  if (order.order_type === "dine-in") return `Table ${order.table_id ?? "assigned"}`;
  return "Pickup";
}

function OrderDetails({ order, onClose }: { order: DashboardOrder; onClose: () => void }) {
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--red2)]">Read-only order details</p>
            <h2 className="mt-1 text-xl font-extrabold">{order.order_number}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Created {dateTime(order.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)]" aria-label="Close order details">
            Close
          </button>
        </div>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <InfoBlock label="Customer" value={`${order.customer_name_snapshot || "Guest"} · ${order.customer_phone_snapshot}`} />
          <InfoBlock label="Fulfilment" value={`${order.order_type} · ${destinationFor(order)}`} />
          <InfoBlock label="Status" value={statusLabels[order.order_status]} />
          <InfoBlock label="Payment" value={`${order.payment_method} · ${order.payment_status}`} />
          {order.scheduled_time && <InfoBlock label="Scheduled time" value={dateTime(order.scheduled_time)} />}
          <InfoBlock label="Last updated" value={dateTime(order.updated_at)} />
        </div>

        <div className="border-t border-[var(--line)] pt-4">
          <h3 className="text-sm font-extrabold">Items</h3>
          <div className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
            {order.items.length > 0 ? order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 p-3 text-sm">
                <div>
                  <p className="font-bold">{item.quantity} × {item.item_name_snapshot}</p>
                  {item.variant_name_snapshot && <p className="text-xs text-[var(--muted)]">{item.variant_name_snapshot}</p>}
                </div>
                <p className="shrink-0 font-bold">{money(item.line_total_paise)}</p>
              </div>
            )) : <p className="p-3 text-sm text-[var(--muted)]">Items unavailable.</p>}
          </div>
          <div className="mt-3 flex items-center justify-between text-base font-extrabold">
            <span>Total</span>
            <span className="text-[var(--red2)]">{money(order.total_paise)}</span>
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

function OrderCard({ order, onOpen }: { order: DashboardOrder; onOpen: () => void }) {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <button type="button" onClick={onOpen} className="w-full rounded-xl border border-[var(--line)] bg-white p-4 text-left shadow-[0_2px_8px_rgba(16,21,28,0.04)] transition hover:-translate-y-0.5 hover:border-[#C9D1DB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--red)] focus:ring-offset-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-[var(--ink)]">{order.order_number}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">{dateTime(order.created_at)}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[order.order_status]}`}>
          {statusLabels[order.order_status]}
        </span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 border-t border-[var(--line)] pt-3">
        <div>
          <p className="text-sm font-bold">{order.customer_name_snapshot || "Guest"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{order.order_type} · {itemCount} {itemCount === 1 ? "item" : "items"}</p>
        </div>
        <p className="text-base font-extrabold text-[var(--red2)]">{money(order.total_paise)}</p>
      </div>
      <p className="mt-3 truncate text-xs text-[var(--muted)]">{destinationFor(order)}</p>
      <p className="mt-3 text-[11px] font-bold text-[var(--red2)]">View details →</p>
    </button>
  );
}

export default function OrdersBoard({ orders, error }: { orders: DashboardOrder[]; error: string | null }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [orderType, setOrderType] = useState<"all" | DashboardOrder["order_type"]>("all");
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !query || [order.order_number, order.customer_name_snapshot, order.customer_phone_snapshot].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (status === "all" || order.order_status === status) && (orderType === "all" || order.order_type === orderType);
    });
  }, [orders, orderType, search, status]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--red2)]">Read-only operations view</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Orders</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Production orders grouped by their current status.</p>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
          {filteredOrders.length} of {orders.length} loaded
        </span>
      </div>

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
          const statusOrders = filteredOrders.filter((order) => order.order_status === columnStatus);
          return <section key={columnStatus} className="min-w-[280px] rounded-xl border border-[var(--line)] bg-[#F8FAFB] p-3">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold">{statusLabels[columnStatus]}</h3><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-[var(--muted)]">{statusOrders.length}</span></div>
            <div className="space-y-3">{statusOrders.length > 0 ? statusOrders.map((order) => <OrderCard key={order.id} order={order} onOpen={() => setSelectedOrder(order)} />) : <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-5 text-center text-xs text-[var(--muted)]">No orders</p>}</div>
          </section>;
        })}
      </div>}

      {selectedOrder && <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </section>
  );
}