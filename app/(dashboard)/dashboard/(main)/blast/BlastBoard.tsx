"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Megaphone, Send, Info, CheckSquare } from "lucide-react";
import { sendBlast } from "./actions";

export default function BlastBoard() {
  const [eligibleCount, setEligibleCount] = useState(0);
  const [headerImage, setHeaderImage] = useState("");
  const [templateName, setTemplateName] = useState("pabbas_promo_en");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; attempted?: number; error?: string } | null>(null);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch count of eligible customers
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("opted_out", false);
        
        if (count !== null) setEligibleCount(count);

        // Fetch settings for blast header image
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "blast_header_image")
          .maybeSingle();
        
        if (data && (data as any).value) {
          setHeaderImage((data as any).value);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Check for passed selection
    const saved = sessionStorage.getItem("pabbas_blast_selection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedPhones(parsed);
        }
      } catch (e) {}
    }
  }, [supabase]);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      // Save header image to settings if changed
      if (headerImage) {
        await supabase
          .from("settings")
          .upsert({ key: "blast_header_image", value: headerImage } as any, { onConflict: "key" });
      }

      const res = await sendBlast(filter, templateName, headerImage, selectedPhones);
      if (res.success && res.data) {
        setResult({
          sent: res.data.sent || 0,
          attempted: res.data.attempted || 0,
          error: res.data.error || undefined,
        });
      } else {
        setResult({ error: res.error || "Blast did not complete. Check the workflow is active in n8n." });
      }
    } catch (e: any) {
      setResult({ error: e.message || "An error occurred while sending." });
    } finally {
      setSending(false);
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
    <div className="max-w-2xl space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-blue-800 mb-2 font-bold uppercase tracking-wider text-xs">
            <Megaphone className="h-4 w-4" /> Eligible Contacts
          </div>
          <div className="text-4xl font-black tracking-tight text-blue-900">{eligibleCount}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-red-800 mb-2 font-bold uppercase tracking-wider text-xs">
            <CheckSquare className="h-4 w-4" /> Selected
          </div>
          <div className="text-4xl font-black tracking-tight text-red-900">{selectedPhones.length}</div>
        </div>
      </div>

      {selectedPhones.length > 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-medium flex justify-between items-center">
          <span>Sending to the {selectedPhones.length} contacts you picked.</span>
          <button 
            onClick={() => {
              setSelectedPhones([]);
              sessionStorage.removeItem("pabbas_blast_selection");
            }}
            className="underline hover:text-red-900 font-bold text-xs uppercase"
          >
            Clear selection
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 font-medium">
          No contacts selected individually (choose specific people from the Contacts page) — this will go to the whole group selected below.
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
            Who to target {selectedPhones.length > 0 && "(Ignored while a selection is active)"}
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm font-medium focus:border-red-500 focus:outline-none disabled:opacity-50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={selectedPhones.length > 0}
          >
            <option value="all">Everyone ({eligibleCount} contacts)</option>
            <option value="active_30">Ordered in the last 30 days</option>
            <option value="repeat">Repeat customers only</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Approved template name</label>
          <input
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium focus:border-red-500 focus:outline-none"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Header image URL</label>
          <input
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium focus:border-red-500 focus:outline-none"
            placeholder="https://... .png"
            value={headerImage}
            onChange={(e) => setHeaderImage(e.target.value)}
          />
          <p className="mt-2 text-xs text-gray-500">
            Templates with an image header require an image on every send. Put your offer creative on a public URL and paste it here.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <p>
          The template must already be approved in Meta, and this workflow must be active in n8n.
          Sends about one per second — leave this tab open.
        </p>
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-base font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50 transition"
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {sending ? "Sending Blast..." : "Send Blast"}
      </button>

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="text-xs font-bold uppercase text-green-700">Sent of {result.attempted || 0}</div>
              <div className="text-3xl font-black text-green-800">{result.sent || 0}</div>
            </div>
          </div>
          {result.error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 border border-red-200">
              <span className="font-bold">Meta says:</span> {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
