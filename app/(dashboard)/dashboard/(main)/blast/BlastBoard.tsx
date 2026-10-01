"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Megaphone, Send, Info, CheckSquare, UploadCloud } from "lucide-react";
import { sendBlast, getYCloudTemplates, uploadYCloudMedia } from "./actions";

export default function BlastBoard() {
  const [eligibleCount, setEligibleCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; attempted?: number; error?: string } | null>(null);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("opted_out", false);
        
        if (count !== null) setEligibleCount(count);

        const tpls = await getYCloudTemplates();
        if (tpls.success && tpls.templates) {
          setTemplates(tpls.templates);
          if (tpls.templates.length > 0) {
            setSelectedTemplateName(tpls.templates[0].name);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

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

  const selectedTemplate = templates.find((t) => t.name === selectedTemplateName);
  const headerComponent = selectedTemplate?.components?.find((c: any) => c.type === "HEADER");
  const requiresMedia = headerComponent?.format === "IMAGE" || headerComponent?.format === "VIDEO" || headerComponent?.format === "DOCUMENT";

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    setResult(null);

    try {
      const components: any[] = [];

      // Handle media if required
      if (requiresMedia) {
        if (!mediaFile) {
          setResult({ error: "Please select a media file for this template's header." });
          setSending(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", mediaFile);
        const uploadRes = await uploadYCloudMedia(formData);
        
        if (!uploadRes.success || !uploadRes.media_id) {
          throw new Error(uploadRes.error || "Failed to upload media");
        }

        const typeMap: any = {
          "IMAGE": "image",
          "VIDEO": "video",
          "DOCUMENT": "document"
        };
        const mediaType = typeMap[headerComponent.format] || "image";

        components.push({
          type: "header",
          parameters: [
            {
              type: mediaType,
              [mediaType]: { id: uploadRes.media_id }
            }
          ]
        });
      }

      const res = await sendBlast(filter, selectedTemplateName, components, selectedPhones);
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
          <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Select Template</label>
          <select
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium focus:border-red-500 focus:outline-none"
            value={selectedTemplateName}
            onChange={(e) => {
              setSelectedTemplateName(e.target.value);
              setMediaFile(null);
            }}
          >
            {templates.length === 0 && <option value="">No approved templates found</option>}
            {templates.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.language})
              </option>
            ))}
          </select>
        </div>

        {requiresMedia && (
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
              Campaign Media ({headerComponent.format})
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> {mediaFile ? mediaFile.name : `a campaign ${headerComponent.format.toLowerCase()}`}
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept={headerComponent.format === "IMAGE" ? "image/*" : headerComponent.format === "VIDEO" ? "video/*" : "*/*"}
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)} 
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              This template requires a {headerComponent.format.toLowerCase()} header. It will be securely uploaded to YCloud before sending.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <p>
          Sends about one per second — leave this tab open until complete. Do a test run first!
        </p>
      </div>

      <button
        onClick={handleSend}
        disabled={sending || (requiresMedia && !mediaFile)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-4 text-base font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50 transition"
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {sending ? "Processing & Sending..." : "Send Blast"}
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
