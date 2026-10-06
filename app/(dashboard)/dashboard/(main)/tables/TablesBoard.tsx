"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { fetchTables, addTable, deleteTable, clearTable, RestaurantTable } from "./actions";
import { QRCodeSVG } from "qrcode.react";

export default function TablesBoard() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, startAdding] = useTransition();
  const [newTable, setNewTable] = useState("");
  const [printTable, setPrintTable] = useState<RestaurantTable | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    setLoading(true);
    const result = await fetchTables();
    if (result.success && result.tables) {
      setTables(result.tables);
    }
    setLoading(false);
  }

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.trim()) return;

    startAdding(async () => {
      const result = await addTable(newTable);
      if (result.success && result.table) {
        setTables([...tables, result.table]);
        setNewTable("");
      } else {
        alert(result.error || "Failed to add table");
      }
    });
  };

  const handleClearTable = async (id: string) => {
    if (!confirm("Are you sure you want to clear this table? Make sure the bill is settled!")) return;
    
    // Optimistic UI
    setTables(prev => prev.map(t => t.id === id ? { ...t, is_active: false, current_order_id: null, orders: null } : t));
    const result = await clearTable(id);
    if (!result.success) {
      loadTables();
      alert(result.error || "Failed to clear table");
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm("Are you sure you want to delete this table forever?")) return;
    
    setTables(prev => prev.filter(t => t.id !== id));
    const result = await deleteTable(id);
    if (!result.success) {
      loadTables();
      alert(result.error || "Failed to delete table");
    }
  };

  const handlePrintQr = (table: RestaurantTable) => {
    setPrintTable(table);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8799AF] font-bold">Loading tables...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      
      {/* Hide dashboard when printing */}
      <div className="print:hidden">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-black text-[#0A1017] tracking-tight flex items-center gap-2">
            <span className="text-[#E23744]">🍽️</span> Dine-In Tables
          </h1>
        </div>

        {/* Add Table Form */}
        <div className="bg-white rounded-2xl border border-[#EAF0F6] shadow-sm overflow-hidden mb-8 max-w-md">
          <div className="p-5 border-b border-[#EAF0F6] bg-[#F8FAFB]">
            <h2 className="text-[14px] font-extrabold text-[#0A1017] mb-3">Add a new table</h2>
            <form onSubmit={handleAddTable} className="flex gap-3">
              <input
                type="text"
                placeholder="Table Number (e.g., T1)"
                value={newTable}
                onChange={(e) => setNewTable(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#EAF0F6] bg-white text-[14px] font-bold text-[#0A1017] focus:border-[#0D6EFD] outline-none transition-all placeholder:text-[#A1B2C6]"
                disabled={isAdding}
              />
              <button
                type="submit"
                disabled={isAdding || !newTable.trim()}
                className="px-6 py-2.5 bg-[#0D6EFD] text-white text-[14px] font-extrabold rounded-xl hover:bg-[#0B5ED7] transition-colors disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add"}
              </button>
            </form>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => {
            const isActive = table.is_active && table.orders;
            const orderLink = typeof window !== "undefined" ? `${window.location.origin}/?table=${encodeURIComponent(table.table_number)}` : "";

            return (
              <div 
                key={table.id} 
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                  isActive ? "border-[#0D6EFD] ring-4 ring-[#0D6EFD]/10" : "border-[#EAF0F6]"
                }`}
              >
                <div className={`p-5 ${isActive ? "bg-[#F5F9FF]" : ""}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-[#0A1017]">{table.table_number}</h3>
                    {isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-extrabold text-green-800 uppercase tracking-widest">
                        Occupied
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-extrabold text-gray-600 uppercase tracking-widest">
                        Available
                      </span>
                    )}
                  </div>

                  {isActive ? (
                    <div className="mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[13px] text-[#8799AF] font-medium mb-0.5">
                            {table.orders?.customer_name} • {table.orders?.customer_phone} • {table.orders?.items_json?.reduce((max: number, item: any) => Math.max(max, item.round || 1), 1)} round(s)
                          </div>
                        </div>
                        <div className="text-[16px] font-extrabold text-[#0A1017]">
                          ₹{table.orders?.total}
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-3 border-t border-dashed border-[#EAF0F6]">
                        {Array.from(new Set((table.orders?.items_json || []).map((item: any) => item.round || 1))).sort().map((roundNumber: any) => {
                          const roundItems = (table.orders?.items_json || []).filter((item: any) => (item.round || 1) === roundNumber);
                          const roundTotal = roundItems.reduce((sum: number, item: any) => sum + (item.price || item.unit_price) * item.quantity, 0);
                          
                          return (
                            <div key={roundNumber} className="text-[13px]">
                              <div className="font-bold text-[#0A1017] mb-1">
                                Round {roundNumber} • {table.orders?.status.replace(/_/g, ' ')} • ₹{roundTotal}
                              </div>
                              <div className="text-[#6B7A90] font-medium">
                                {roundItems.map((item: any, idx: number) => (
                                  <div key={idx}>{item.item_name} {item.variant_name ? `(${item.variant_name})` : ''} x{item.quantity}</div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="pt-4 mt-2">
                         <button 
                            onClick={() => handleClearTable(table.id)}
                            className="w-max px-4 py-2 bg-green-50 border border-green-200 text-green-700 font-bold text-[13px] rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
                          >
                            <span className="text-green-600">💵</span> Close table • ₹{table.orders?.total}
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                       <p className="text-[13px] font-medium text-[#8799AF]">No active orders for this table.</p>
                    </div>
                  )}

                </div>

                <div className="bg-[#F8FAFB] p-3 border-t border-[#EAF0F6] flex gap-2">
                  <button
                    onClick={() => handlePrintQr(table)}
                    className="flex-1 py-2 text-[12px] font-extrabold text-[#0A1017] border border-[#EAF0F6] bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    🖨️ Print QR
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="px-3 py-2 text-[12px] font-extrabold text-[#C0392B] border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {tables.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#EAF0F6]">
            <span className="text-4xl mb-4 block">🪑</span>
            <h3 className="text-lg font-black text-[#0A1017] mb-2">No tables found</h3>
            <p className="text-[#8799AF] font-medium text-[14px]">Add your first table using the form above.</p>
          </div>
        )}
      </div>

      {/* Print QR Code Template - Only visible during print */}
      <div className="hidden print:flex flex-col items-center justify-center h-screen w-full bg-white">
        {printTable && (
          <div className="w-[10cm] h-[15cm] border-[3px] border-[#0A1017] rounded-3xl flex flex-col items-center justify-between p-8 text-center bg-white shadow-2xl relative overflow-hidden">
            
            {/* Top Pattern Decor */}
            <div className="absolute top-0 left-0 w-full h-32 bg-[#E23744]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 80%)'}}></div>
            
            <div className="relative z-10 w-full">
              <h1 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase">Pabbas</h1>
              <p className="text-[12px] font-extrabold text-white/90 tracking-widest uppercase">Ideal Ice Cream</p>
            </div>
            
            <div className="relative z-10 mt-12 mb-4 bg-white p-4 rounded-3xl border-4 border-[#0A1017] shadow-xl">
              <QRCodeSVG 
                value={typeof window !== "undefined" ? `${window.location.origin}/?table=${encodeURIComponent(printTable.table_number)}` : ""}
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#0A1017"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <div className="relative z-10 mb-8 w-full">
              <h2 className="text-[32px] font-black text-[#0A1017] leading-none mb-2">
                {printTable.table_number}
              </h2>
              <div className="w-16 h-1 bg-[#E23744] mx-auto rounded-full mb-4"></div>
              <p className="text-[16px] font-extrabold text-[#6B7A90] uppercase tracking-widest leading-snug">
                Scan with your phone<br/>to order & pay
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
