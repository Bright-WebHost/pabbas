import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { CustomerDetails } from "@/lib/types";

interface PickupSetupProps {
  details: CustomerDetails;
  setDetails: (details: CustomerDetails) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function PickupSetup({ details, setDetails, onBack, onContinue }: PickupSetupProps) {
  const update = (field: keyof CustomerDetails, value: string) => setDetails({ ...details, [field]: value });

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="delivery-setup w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      <button onClick={onBack} className="back-button"><ArrowLeft size={17} /> Change order type</button>
      <div className="mt-6 flex items-start gap-3"><div className="mode-icon"><ShoppingBag size={20} /></div><div><p className="eyebrow">Takeaway details</p><h2 className="section-title mt-1">When will you pick it up?</h2><p className="mt-2 text-sm text-gray-500">Let us know when to keep your order ready.</p></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
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
      <button onClick={onContinue} disabled={!details.name || !details.pickupDate || !details.pickupTime} className="primary-button mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40">Save & view menu <Check size={18} /></button>
    </div>
  </div>;
}
