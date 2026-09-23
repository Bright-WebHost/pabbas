import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-[212px] bg-[var(--navy)] text-white p-5 sticky top-0 h-screen flex flex-col">
      <div className="text-center py-2 pb-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--red)] text-white font-[Fraunces] text-3xl font-bold grid place-items-center mx-auto mb-3 shadow-[0_6px_18px_rgba(226,55,68,0.34)]">
          O
        </div>
        <div className="text-[27px] font-extrabold tracking-[-0.6px] leading-none">Oceana</div>
        <div className="text-[10px] tracking-[3px] text-[var(--red)] mt-1.5 font-extrabold uppercase">Order Hub</div>
      </div>
      
      <nav className="mt-6 flex flex-col gap-1 flex-1">
        <SidebarLink href="/dashboard" label="🧾 Orders" active />
        <SidebarLink href="/dashboard/chat" label="💬 Live Chat" />
        <SidebarLink href="/dashboard/menu" label="📋 Menu" />
        <SidebarLink href="/dashboard/stats" label="📊 Analytics" />
        <SidebarLink href="/dashboard/contacts" label="👥 Contacts" />
        <SidebarLink href="/dashboard/blast" label="📣 Blast" />
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-[#223040] pt-4">
        <button className="bg-[var(--navy2)] text-[#C7D2DE] p-3 rounded-xl text-[13px] font-semibold text-left hover:bg-[#26364a] hover:text-white transition-colors">
          ↻ Refresh Now
        </button>
        <button className="bg-[var(--navy2)] text-[#C7D2DE] p-3 rounded-xl text-[13px] font-semibold text-left hover:bg-[#26364a] hover:text-white transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 p-3 rounded-xl font-semibold text-sm relative transition-colors ${
        active ? 'bg-[var(--navy2)] text-white' : 'text-[#95A3B5] hover:bg-[var(--navy2)] hover:text-white'
      }`}
    >
      {active && (
        <span className="absolute left-[-20px] top-[9px] bottom-[9px] w-1 rounded-r bg-[var(--red)]" />
      )}
      {label}
    </Link>
  );
}
