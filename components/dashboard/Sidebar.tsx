"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrderManager } from "@/app/(dashboard)/dashboard/OrderManagerProvider";
import { useStaff } from "@/components/providers/StaffProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { refreshOrders, toggleSound, soundEnabled } = useOrderManager();
  const { hasPerm } = useStaff();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex print:hidden w-[230px] bg-[#0A1017] text-white p-4 sticky top-0 h-screen flex-col border-r border-[#1C2633] shrink-0 z-40">
        <div className="flex items-center gap-3 py-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#E23744] to-[#B0202B] text-white font-[Fraunces] text-xl font-bold grid place-items-center shadow-[0_4px_12px_rgba(226,55,68,0.3)]">
            P
          </div>
          <div className="flex flex-col">
            <span className="text-[18px] font-extrabold tracking-[-0.5px] leading-none text-white">Pabbas</span>
            <span className="text-[9px] tracking-[2px] text-[#A1B2C6] mt-1 font-bold uppercase">Staff Hub</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 pb-4 scrollbar-hide">
          {(hasPerm("view_orders_full") || hasPerm("view_orders_basic")) && (
            <SidebarLink href="/dashboard" label="Orders" icon="🧾" active={pathname === "/dashboard"} />
          )}
          {hasPerm("kitchen_screen") && (
            <SidebarLink href="/dashboard/kitchen" label="Kitchen" icon="🍳" active={pathname === "/dashboard/kitchen"} />
          )}
          {hasPerm("pos") && (
            <SidebarLink href="/dashboard/pos" label="POS" icon="💻" active={pathname === "/dashboard/pos"} />
          )}
          {hasPerm("tables") && (
            <SidebarLink href="/dashboard/tables" label="Tables" icon="🍽️" active={pathname === "/dashboard/tables"} />
          )}
          {hasPerm("chat") && (
            <SidebarLink href="/dashboard/chat" label="Live Chat" icon="💬" active={pathname === "/dashboard/chat"} />
          )}
          {hasPerm("manage_menu") && (
            <SidebarLink href="/dashboard/menu" label="Menu" icon="📋" active={pathname === "/dashboard/menu"} />
          )}
          {hasPerm("view_riders") && (
            <SidebarLink href="/dashboard/riders" label="Riders" icon="🛵" active={pathname === "/dashboard/riders"} />
          )}
          {hasPerm("analytics") && (
            <SidebarLink href="/dashboard/stats" label="Analytics" icon="📊" active={pathname === "/dashboard/stats"} />
          )}
          {hasPerm("contacts") && (
            <SidebarLink href="/dashboard/contacts" label="Contacts" icon="👥" active={pathname === "/dashboard/contacts"} />
          )}
          {hasPerm("blast") && (
            <SidebarLink href="/dashboard/blast" label="Blast" icon="📣" active={pathname === "/dashboard/blast"} />
          )}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 border-t border-[#1C2633] pt-4">
          <SidebarButton onClick={() => void refreshOrders()} icon="↻" label="Refresh Now" />
          <SidebarButton onClick={toggleSound} icon={soundEnabled ? "🔕" : "🔔"} label={soundEnabled ? "Disable sound" : "Enable sound"} />
          <SidebarButton 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/dashboard/login");
            }} 
            icon="🚪" 
            label="Sign out" 
          />
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <aside className="md:hidden print:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-[#0A1017] border-t border-[#1C2633] z-50 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
        {(hasPerm("view_orders_full") || hasPerm("view_orders_basic")) && (
          <MobileTab href="/dashboard" icon="🧾" active={pathname === "/dashboard"} />
        )}
        {hasPerm("kitchen_screen") && (
          <MobileTab href="/dashboard/kitchen" icon="🍳" active={pathname === "/dashboard/kitchen"} />
        )}
        {hasPerm("pos") && (
          <MobileTab href="/dashboard/pos" icon="💻" active={pathname === "/dashboard/pos"} />
        )}
        {hasPerm("tables") && (
          <MobileTab href="/dashboard/tables" icon="🍽️" active={pathname === "/dashboard/tables"} />
        )}
        {hasPerm("manage_menu") && (
          <MobileTab href="/dashboard/menu" icon="📋" active={pathname === "/dashboard/menu"} />
        )}
        {hasPerm("view_riders") && (
          <MobileTab href="/dashboard/riders" icon="🛵" active={pathname === "/dashboard/riders"} />
        )}
        {hasPerm("analytics") && (
          <MobileTab href="/dashboard/stats" icon="📊" active={pathname === "/dashboard/stats"} />
        )}
        <button onClick={toggleSound} className="flex flex-col items-center justify-center w-12 h-12 text-[#8799AF]">
          <span className="text-[20px]">{soundEnabled ? "🔕" : "🔔"}</span>
        </button>
      </aside>
    </>
  );
}

function SidebarLink({ href, label, icon, active = false }: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-bold text-[13px] transition-all duration-200 ${
        active 
          ? 'bg-[#17212D] text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-[#233142]' 
          : 'text-[#8799AF] hover:bg-[#111923] hover:text-[#C7D3E1] border border-transparent'
      }`}
    >
      <span className="text-[15px] opacity-80">{icon}</span>
      {label}
      {active && <span className="absolute left-0 w-1 h-6 rounded-r bg-[#E23744]" />}
    </Link>
  );
}

function SidebarButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-bold text-[13px] text-[#8799AF] hover:bg-[#111923] hover:text-[#C7D3E1] transition-all border border-transparent text-left w-full"
    >
      <span className="text-[15px] opacity-80">{icon}</span>
      {label}
    </button>
  );
}

function MobileTab({ href, icon, active = false }: { href: string; icon: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-200 relative ${
        active ? 'text-[#E23744]' : 'text-[#8799AF]'
      }`}
    >
      <span className={`text-[20px] ${active ? 'scale-110' : ''} transition-transform`}>{icon}</span>
      {active && <span className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#E23744]" />}
    </Link>
  );
}
