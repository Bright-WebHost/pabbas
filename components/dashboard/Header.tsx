"use client";

import { useOrderManager } from "@/app/(dashboard)/dashboard/OrderManagerProvider";
import { useStaff } from "@/components/providers/StaffProvider";

export default function Header() {
  const { isRealtimeConnected, lastUpdated } = useOrderManager();
  const { staff } = useStaff();
  
  const title = staff.role === 'admin' ? 'Admin Dashboard' : 
                staff.role === 'kitchen' ? 'Kitchen Dashboard' :
                staff.role === 'counter' ? 'Counter Dashboard' :
                staff.role === 'waiter' ? 'Waiter Dashboard' : 'Dashboard';
  
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#EAF0F6] bg-white/90 backdrop-blur-md px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.6px] text-[#0A1017]">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        {isRealtimeConnected ? (
          <div className="flex items-center gap-2 rounded-full bg-[#E5F5EC] px-3.5 py-1.5 border border-[#C6ECD6] shadow-[0_0_12px_rgba(25,135,84,0.15)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#198754] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#198754]"></span>
            </span>
            <span className="text-[12px] font-bold tracking-tight text-[#146C43]">Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-[#FFF4E5] px-3.5 py-1.5 border border-[#FDE1B9] shadow-[0_0_12px_rgba(184,115,11,0.15)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#B8730B]"></span>
            </span>
            <span className="text-[12px] font-bold tracking-tight text-[#935C09]">Reconnecting...</span>
          </div>
        )}
        <span className="rounded-full bg-[#F3F6F9] px-3.5 py-1.5 text-[12px] font-bold text-[#6B7A90] border border-[#E5E9F0]">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "Updating..."}
        </span>
        <div className="flex items-center gap-2 rounded-full bg-[#EAF2FD] px-3.5 py-1.5 border border-[#C9DEFA]">
          <div className="h-2 w-2 rounded-full bg-[#0D6EFD]" />
          <span className="text-[12px] font-bold tracking-tight text-[#0A58CA]">Staff online</span>
        </div>
      </div>
    </header>
  );
}
