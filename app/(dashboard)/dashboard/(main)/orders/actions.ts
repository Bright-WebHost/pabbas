"use server";

import { createClient } from "@/lib/supabase/server";

export async function notifyStatusWebhook(order_number: string, status: string) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : "";

    const url = process.env.N8N_STATUS_WEBHOOK_URL || "https://staff.brightmedia.tech/webhook/pabbas-status";
    const secret = process.env.PABBAS_WHATSAPP_INBOUND_SECRET || process.env.PABBAS_AI_WEBHOOK_SECRET || process.env.PABBAS_N8N_WEBHOOK_SECRET || "";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "x-pabbas-whatsapp-secret": secret,
      },
      body: JSON.stringify({ order_number, status }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Status Notifier Webhook failed with status ${response.status}: ${errText}`);
      return { success: false, error: `Webhook returned error ${response.status}` };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to call Status Notifier Webhook:", error);
    return { success: false, error: error.message };
  }
}
