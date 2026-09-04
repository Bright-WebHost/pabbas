import { ArrowLeft, Check, Utensils } from "lucide-react";
import { CustomerDetails } from "@/lib/types";

interface DineInSetupProps {
  table: string;
  setTable: (table: string) => void;
  details: CustomerDetails;
  setDetails: (details: CustomerDetails) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function DineInSetup({ table, setTable, details, setDetails, onBack, onContinue }: DineInSetupProps) {
  const update = (field: keyof CustomerDetails, value: string) => setDetails({ ...details, [field]: value });

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="delivery-setup w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      <button onClick={onBack} className="back-button"><ArrowLeft size={17} /> Change order type</button>
      <div className="mt-6 flex items-start gap-3"><div className="mode-icon"><Utensils size={20} /></div><div><p className="eyebrow">Dine-in details</p><h2 className="section-title mt-1">Reserve your table</h2><p className="mt-2 text-sm text-gray-500">Provide your details to dine with us.</p></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <label className="field-label sm:col-span-2">Select Table
          <select value={table} onChange={(e) => setTable(e.target.value)}>
             <option value="No table / Takeaway" disabled>Select a table</option>
             {Array.from({ length: 20 }, (_, index) => `Table ${index + 1}`).map(val => (
               <option key={val} value={val}>{val}</option>
             ))}
          </select>
        </label>
        <input className="checkout-input" placeholder="Your Name" value={details.name} onChange={(event) => update("name", event.target.value)} />
        <input className="checkout-input" placeholder="Mobile Number" inputMode="tel" value={details.phone} onChange={(event) => update("phone", event.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Date</label>
          <input className="checkout-input" type="date" value={details.pickupDate} onChange={(event) => update("pickupDate", event.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Time</label>
          <input className="checkout-input" type="time" value={details.pickupTime} onChange={(event) => update("pickupTime", event.target.value)} />
        </div>
      </div>
      <button onClick={onContinue} disabled={!details.name || table === "No table / Takeaway" || !details.pickupDate || !details.pickupTime} className="primary-button mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40">Save & view menu <Check size={18} /></button>
    </div>
  </div>;
}
