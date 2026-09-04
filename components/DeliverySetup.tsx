import { ArrowLeft, Check, MapPin } from "lucide-react";
import { CustomerDetails } from "@/lib/types";

interface DeliverySetupProps {
  details: CustomerDetails;
  setDetails: (details: CustomerDetails) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function DeliverySetup({ details, setDetails, onBack, onContinue }: DeliverySetupProps) {
  const update = (field: keyof CustomerDetails, value: string) => setDetails({ ...details, [field]: value });

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252321]/50 p-4">
    <div className="delivery-setup w-full max-w-lg rounded-[24px] bg-[#fbf8f3] p-6 shadow-2xl sm:p-8">
      <button onClick={onBack} className="back-button"><ArrowLeft size={17} /> Change order type</button>
      <div className="mt-6 flex items-start gap-3"><div className="mode-icon"><MapPin size={20} /></div><div><p className="eyebrow">Delivery details</p><h2 className="section-title mt-1">Where should we bring it?</h2><p className="mt-2 text-sm text-[#716d68]">Save your address now and we&apos;ll keep it ready through checkout.</p></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2"><input className="checkout-input" placeholder="Full name" value={details.name} onChange={(event) => update("name", event.target.value)} /><input className="checkout-input" placeholder="Mobile number" inputMode="tel" value={details.phone} onChange={(event) => update("phone", event.target.value)} /><input className="checkout-input sm:col-span-2" placeholder="Flat, building, street address" value={details.address} onChange={(event) => update("address", event.target.value)} /><input className="checkout-input" placeholder="Landmark (optional)" value={details.landmark} onChange={(event) => update("landmark", event.target.value)} /><input className="checkout-input" placeholder="Pincode" inputMode="numeric" value={details.pincode} onChange={(event) => update("pincode", event.target.value)} /></div>
      <button onClick={onContinue} disabled={!details.address} className="primary-button mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40">Save address & view menu <Check size={18} /></button>
    </div>
  </div>;
}
