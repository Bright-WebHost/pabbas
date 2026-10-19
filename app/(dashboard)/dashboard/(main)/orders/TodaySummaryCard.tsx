"use client";

import { useEffect, useState } from "react";
import { getTodaySummary, type TodaySummary } from "@/lib/orders/summary";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const STORAGE_KEY = "pabbas_today_summary_open";

/** Admin-only "Today" card: refreshes every minute and whenever the order count changes. */
export function TodaySummaryCard({ ordersVersion }: { ordersVersion: number }) {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [open, setOpen] = useState(() => {
    try { return typeof window === "undefined" || localStorage.getItem(STORAGE_KEY) !== "false"; } catch { return true; }
  });

  useEffect(() => {
    let active = true;
    const load = () => getTodaySummary().then((r) => { if (active && r.success) setSummary(r.summary); }).catch(() => {});
    load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [ordersVersion]);

  const toggle = () => {
    setOpen((o) => {
      try { localStorage.setItem(STORAGE_KEY, String(!o)); } catch {}
      return !o;
    });
  };

  if (!summary) return null;
  const types = Object.entries(summary.byType).sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-[20px] border border-[#EAF0F6] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left">
        <span className="text-[13px] font-extrabold uppercase tracking-widest text-[#0A1017]">📊 Today&apos;s summary</span>
        <span className="flex items-center gap-3 text-[13px] font-bold text-[#6B7A90]">
          {!open && <span>{summary.orders} orders · {money(summary.revenue)}</span>}
          <span>{open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-[#EAF0F6] p-5 grid gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]">
          <Stat label="Orders" value={String(summary.orders)} hint={summary.waitingToAccept ? `${summary.waitingToAccept} waiting to accept` : undefined} />
          <Stat label="Revenue" value={money(summary.revenue)} hint={summary.orders ? `avg ${money(summary.averageOrder)}` : undefined} />
          <Stat label="Cancelled" value={String(summary.cancelled)} tone={summary.cancelled ? "warn" : undefined} />
          <Stat
            label="Cash with riders"
            value={money(summary.cashWithRiders.amount)}
            hint={summary.cashWithRiders.orders ? `${summary.cashWithRiders.orders} delivered, not collected` : "all collected"}
            tone={summary.cashWithRiders.orders ? "warn" : undefined}
          />
          <div className="rounded-xl bg-[#F8FAFB] border border-[#EAF0F6] p-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8799AF]">Top items</p>
            {summary.topItems.length ? (
              <ol className="mt-1.5 space-y-0.5">
                {summary.topItems.map((it) => (
                  <li key={it.name} className="flex justify-between text-[13px] font-semibold text-[#0A1017]">
                    <span className="truncate">{it.name}</span>
                    <span className="text-[#6B7A90] ml-2">×{it.quantity}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1.5 text-[13px] font-medium text-[#8799AF]">No orders yet today</p>
            )}
            {types.length > 0 && (
              <p className="mt-2 text-[11.5px] font-semibold text-[#6B7A90]">{types.map(([t, n]) => `${t} ${n}`).join(" · ")}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-3.5 ${tone === "warn" ? "bg-[#FFF7E6] border-[#F3D28B]" : "bg-[#F8FAFB] border-[#EAF0F6]"}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#8799AF]">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold tracking-tight text-[#0A1017]">{value}</p>
      {hint && <p className="text-[12px] font-semibold text-[#6B7A90]">{hint}</p>}
    </div>
  );
}
