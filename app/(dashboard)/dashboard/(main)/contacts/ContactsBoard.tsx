"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, CheckSquare, UserX, Upload, Search, Download, Megaphone } from "lucide-react";
import { importContacts } from "./actions";
import { useRouter } from "next/navigation";

type Customer = {
  phone: string;
  name: string | null;
  total_orders: number;
  last_order_date: string | null;
  opted_out: boolean;
};

export default function ContactsBoard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  
  // Import state
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const router = useRouter();

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from("customers")
        .select("phone, name, total_orders, last_order_date, opted_out")
        .order("last_order_date", { ascending: false, nullsFirst: false })
        .limit(1000);
      
      if (data) {
        setCustomers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [supabase]);

  const handleImport = async (textToImport: string) => {
    if (!textToImport.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importContacts(textToImport);
      setImportResult(res);
      if (res.success) {
        setImportText("");
        await fetchCustomers();
      }
    } catch (e: any) {
      setImportResult({ success: false, error: e.message || "Failed to import" });
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) handleImport(text);
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) handleImport(text);
      };
      reader.readAsText(file);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.phone.includes(searchQuery) ||
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const eligibleShown = filteredCustomers.filter(c => !c.opted_out);

  const toggleSelectAll = () => {
    if (eligibleShown.every((c) => selectedPhones.has(c.phone))) {
      // Deselect all shown
      const next = new Set(selectedPhones);
      eligibleShown.forEach((c) => next.delete(c.phone));
      setSelectedPhones(next);
    } else {
      // Select all shown
      const next = new Set(selectedPhones);
      eligibleShown.forEach((c) => next.add(c.phone));
      setSelectedPhones(next);
    }
  };

  const togglePhone = (phone: string) => {
    const next = new Set(selectedPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    setSelectedPhones(next);
  };
  
  const handleProceedToBlast = () => {
    if (selectedPhones.size > 0) {
      sessionStorage.setItem("pabbas_blast_selection", JSON.stringify(Array.from(selectedPhones)));
      router.push("/dashboard/blast");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-blue-800 mb-2 font-bold uppercase tracking-wider text-xs">
            <Users className="h-4 w-4" /> Saved Contacts
          </div>
          <div className="text-3xl font-black tracking-tight text-blue-900">{customers.length}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-red-800 mb-2 font-bold uppercase tracking-wider text-xs">
            <CheckSquare className="h-4 w-4" /> Selected
          </div>
          <div className="text-3xl font-black tracking-tight text-red-900">{selectedPhones.size}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 mb-2 font-bold uppercase tracking-wider text-xs">
            <UserX className="h-4 w-4" /> Opted Out
          </div>
          <div className="text-3xl font-black tracking-tight text-gray-700">
            {customers.filter((c) => c.opted_out).length}
          </div>
        </div>
      </div>

      {/* Import tool */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold">Import Contacts</h3>
        <div 
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <div className="text-sm font-medium text-gray-900">Add numbers</div>
          <p className="text-xs text-gray-500 mb-4 mt-1">Drop a CSV here, or choose a file</p>
          <input
            type="file"
            accept=".csv,.txt"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Choose CSV
          </button>
        </div>
        
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2">OR PASTE NUMBERS</p>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-500 focus:outline-none"
            rows={3}
            placeholder="9663428354, 7795240605..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button
            onClick={() => handleImport(importText)}
            disabled={importing || !importText.trim()}
            className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Add to contacts"}
          </button>
        </div>

        {importResult && (
          <div className={`mt-2 rounded-lg p-3 text-sm font-medium ${importResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {importResult.success ? `Successfully imported ${importResult.count} contacts!` : `Error: ${importResult.error}`}
          </div>
        )}
      </div>

      {/* Roster & Filter */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or number"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={toggleSelectAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {eligibleShown.length > 0 && eligibleShown.every((c) => selectedPhones.has(c.phone)) ? "Deselect All" : `Select all shown (${eligibleShown.length})`}
          </button>
          <button 
            onClick={() => setSelectedPhones(new Set())}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Clear
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 font-bold">Number</th>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Orders</th>
                <th className="px-4 py-3 font-bold">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.slice(0, 400).map((c) => (
                  <tr key={c.phone} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPhones.has(c.phone)}
                        onChange={() => togglePhone(c.phone)}
                        disabled={c.opted_out}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{c.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.total_orders || 0}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : "—"}
                      {c.opted_out && <span className="ml-2 font-bold text-red-600 uppercase tracking-wide">Opted out</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No contacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredCustomers.length > 400 && (
            <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
              Showing first 400 — search to narrow.
            </div>
          )}
        </div>
      </div>
      
      {/* Sticky footer for blast action */}
      {selectedPhones.size > 0 && (
        <div className="sticky bottom-6 left-0 right-0 mx-auto max-w-md flex justify-center mt-6 z-10 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button 
            onClick={handleProceedToBlast}
            className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-xl hover:bg-red-700 hover:scale-105 transition-all"
          >
            <Megaphone className="h-5 w-5" />
            Proceed to Blast with {selectedPhones.size} contacts →
          </button>
        </div>
      )}
    </div>
  );
}
