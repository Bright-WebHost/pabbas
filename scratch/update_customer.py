import os

with open('app/(customer)/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """function Confirmation({ orderNumber, orderType, table, cart, total, onContinue }: { orderNumber: string; orderType: OrderType; table: string; cart: CartItem[]; total: number; onContinue: () => void }) { 
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const handleCancel = async () => {
    const reason = window.prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    
    setCancelling(true);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, cancel_reason: reason })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to cancel');
      setCancelled(true);
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (cancelled) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-xl text-center border border-gray-100">
        <div className="w-[84px] h-[84px] bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <X size={44} strokeWidth={3} />
        </div>
        <h1 className="text-[26px] font-extrabold mb-2 text-gray-900">Order Cancelled</h1>
        <p className="text-gray-500 mb-6 font-medium">Your order has been successfully cancelled.</p>
        <button onClick={onContinue} className="w-full bg-[#ef4f5f] text-white font-bold py-[15px] rounded-[14px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Back to Home</button>
      </div>
    </main>;
  }

  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-xl text-center border border-gray-100">
      <div className="w-[84px] h-[84px] bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={44} strokeWidth={3} />
      </div>
      <h1 className="text-[26px] font-extrabold mb-2 text-gray-900">Order Confirmed!</h1>
      <p className="text-gray-500 mb-6 font-medium">Your request has been received.</p>
      
      <div className="flex items-center justify-center gap-2 mb-8 text-[#25D366] bg-[#25D366]/10 px-4 py-2 rounded-full mx-auto w-max text-[13px] font-semibold border border-[#25D366]/20 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
        WhatsApp confirmation prepared
      </div>
      
      <div className="bg-gray-50 rounded-[16px] p-5 mb-8 text-left border border-gray-100">
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Number</span>
          <strong className="font-bold text-gray-900">{orderNumber}</strong>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Type</span>
          <strong className="font-bold text-gray-900 capitalize">{orderType === "dine-in" ? table : orderType}</strong>
        </div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 mt-1">
          <span className="text-gray-500 text-[14px] font-medium">Amount Paid</span>
          <strong className="font-extrabold text-gray-900 text-[16px]">{money(total)}</strong>
        </div>
      </div>
      
      {cancelError && <p className="text-red-500 text-sm mb-4">{cancelError}</p>}
      <div className="flex flex-col gap-3">
        <button onClick={onContinue} className="w-full bg-[#ef4f5f] text-white font-bold py-[15px] rounded-[14px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Back to Home</button>
        <button disabled={cancelling} onClick={handleCancel} className="w-full bg-white text-red-500 border border-red-200 font-bold py-[15px] rounded-[14px] active:scale-[0.98] transition">{cancelling ? 'Cancelling...' : 'Cancel Order'}</button>
      </div>
    </div>
  </main> 
}"""

target = """function Confirmation({ orderNumber, orderType, table, cart, total, onContinue }: { orderNumber: string; orderType: OrderType; table: string; cart: CartItem[]; total: number; onContinue: () => void }) { 
  return <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-xl text-center border border-gray-100">
      <div className="w-[84px] h-[84px] bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={44} strokeWidth={3} />
      </div>
      <h1 className="text-[26px] font-extrabold mb-2 text-gray-900">Order Confirmed!</h1>
      <p className="text-gray-500 mb-6 font-medium">Your request has been received.</p>
      
      <div className="flex items-center justify-center gap-2 mb-8 text-[#25D366] bg-[#25D366]/10 px-4 py-2 rounded-full mx-auto w-max text-[13px] font-semibold border border-[#25D366]/20 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
        WhatsApp confirmation prepared
      </div>
      
      <div className="bg-gray-50 rounded-[16px] p-5 mb-8 text-left border border-gray-100">
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Number</span>
          <strong className="font-bold text-gray-900">{orderNumber}</strong>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-gray-500 text-[14px] font-medium">Order Type</span>
          <strong className="font-bold text-gray-900 capitalize">{orderType === "dine-in" ? table : orderType}</strong>
        </div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 mt-1">
          <span className="text-gray-500 text-[14px] font-medium">Amount Paid</span>
          <strong className="font-extrabold text-gray-900 text-[16px]">{money(total)}</strong>
        </div>
      </div>
      
      <button onClick={onContinue} className="w-full bg-[#ef4f5f] text-white font-bold py-[15px] rounded-[14px] shadow-md shadow-red-500/20 active:scale-[0.98] transition">Back to Home</button>
    </div>
  </main> 
}"""

new_content = content.replace(target, replacement)
with open('app/(customer)/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
