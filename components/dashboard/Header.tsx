"use client";

import { useOrderManager } from "@/app/(dashboard)/dashboard/OrderManagerProvider";

export default function Header() {
  const { isRealtimeConnected, lastUpdated } = useOrderManager();
  
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-3.5 shadow-[0_1px_0_rgba(16,21,28,0.04)]">
      <h1 className="m-0 text-[25px] font-extrabold tracking-[-0.4px] text-[var(--ink)]">Orders</h1>
      <div className="flex flex-wrap items-center gap-2">
        {isRealtimeConnected ? (
          <span className="rounded-full bg-[#E8F7EE] px-3 py-1.5 text-[11px] font-bold text-[#1F8A4C]">● Live</span>
        ) : (
          <span className="rounded-full bg-[#FFF3E5] px-3 py-1.5 text-[11px] font-bold text-[#B8730B]">● Reconnecting...</span>
        )}
        <span className="rounded-full bg-[#F1F3F6] px-3 py-1.5 text-[11px] font-bold text-[var(--muted)]">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "Updating..."}
        </span>
        <span className="rounded-full bg-[#E8F0FE] px-3 py-1.5 text-[11px] font-bold text-[#1967D2]">● Staff online</span>
      </div>
    </header>
  );
}
