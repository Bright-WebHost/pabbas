"use client";

import { useState, useEffect, useTransition } from "react";
import { fetchRiders, addRider, toggleRiderStatus, Rider } from "./actions";
import { Plus } from "lucide-react";

export default function RidersBoard() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add rider form state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isAdding, startAdding] = useTransition();

  useEffect(() => {
    loadRiders();
  }, []);

  async function loadRiders() {
    setLoading(true);
    const result = await fetchRiders();
    if (result.success && result.riders) {
      setRiders(result.riders);
    }
    setLoading(false);
  }

  const handleAddRider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    startAdding(async () => {
      const result = await addRider(newName, newPhone);
      if (result.success && result.rider) {
        setRiders([result.rider, ...riders]);
        setNewName("");
        setNewPhone("");
      } else {
        alert(result.error || "Failed to add rider");
      }
    });
  };

  const handleToggleStatus = async (riderId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setRiders(prev => prev.map(r => r.id === riderId ? { ...r, is_active: !currentStatus } : r));
    
    const result = await toggleRiderStatus(riderId, !currentStatus);
    if (!result.success) {
      // Revert on failure
      setRiders(prev => prev.map(r => r.id === riderId ? { ...r, is_active: currentStatus } : r));
      alert(result.error || "Failed to update status");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0A1017] tracking-tight flex items-center gap-2">
          <span className="text-[#E23744]">🛵</span> Riders
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#EAF0F6] shadow-sm overflow-hidden mb-8">
        <div className="p-5 border-b border-[#EAF0F6] bg-[#F8FAFB]">
          <h2 className="text-[14px] font-extrabold text-[#0A1017] mb-3">Add a rider</h2>
          <form onSubmit={handleAddRider} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#EAF0F6] bg-white text-[14px] font-bold text-[#0A1017] focus:border-[#0D6EFD] outline-none transition-all placeholder:text-[#A1B2C6]"
              disabled={isAdding}
            />
            <input
              type="text"
              placeholder="WhatsApp number"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#EAF0F6] bg-white text-[14px] font-bold text-[#0A1017] focus:border-[#0D6EFD] outline-none transition-all placeholder:text-[#A1B2C6]"
              disabled={isAdding}
            />
            <button
              type="submit"
              disabled={isAdding || !newName.trim() || !newPhone.trim()}
              className="px-6 py-2.5 bg-[#E23744] text-white text-[14px] font-extrabold rounded-xl hover:bg-[#C0392B] transition-colors disabled:opacity-50 shrink-0"
            >
              {isAdding ? "Adding..." : "Add"}
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAF0F6]">
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-[#8799AF] uppercase w-1/4">Rider</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-[#8799AF] uppercase w-1/4">Number</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-[#8799AF] uppercase w-1/4">Deliveries</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-[#8799AF] uppercase w-1/4">Cash Collected</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-[#8799AF] uppercase w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF0F6]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8799AF] font-bold text-[14px]">
                    Loading riders...
                  </td>
                </tr>
              ) : riders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8799AF] font-bold text-[14px]">
                    No riders added yet.
                  </td>
                </tr>
              ) : (
                riders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-6 py-4 text-[14px] font-extrabold text-[#0A1017]">
                      {rider.name}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-[#6B7A90]">
                      {rider.whatsapp_number}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-[#6B7A90]">
                      {rider.deliveries_count}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-extrabold text-[#0A1017]">
                      ₹{rider.cash_collected}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(rider.id, rider.is_active)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          rider.is_active ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rider.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
