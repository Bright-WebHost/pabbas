export default function Header() {
  return (
    <header className="flex items-center justify-between gap-4 -mx-5 mb-4 p-4 px-5 bg-white border-b border-[var(--line)] sticky top-0 z-10">
      <h1 className="text-[25px] font-extrabold m-0 tracking-[-0.4px]">Orders</h1>
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#E8F7EE] text-[#1F8A4C]">
          🟢 System Online
        </span>
        <span className="text-xs text-[var(--muted)]">Updated just now</span>
      </div>
    </header>
  );
}
