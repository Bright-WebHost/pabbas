"use server";
import { createClient } from "@/lib/supabase/server";

export async function notifyStatusWebhook(order_number: string, status: string, cancel_reason?: string, extraData?: any) {
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
      body: JSON.stringify({ 
        order_number, 
        status, 
        cancel_reason: cancel_reason || null, 
        staff_token: session?.access_token || "",
        ...extraData
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[notifyStatusWebhook] N8N Webhook failed:", response.status, errText);
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[notifyStatusWebhook] Error triggering webhook:", err);
    return { success: false, error: err.message };
  }
}

export async function notifyOrderCreatedWebhook(payload: any) {
  try {
    const notifyUrl = process.env.N8N_ORDER_CREATED_WEBHOOK_URL || 'https://staff.brightmedia.tech/webhook/pabbas-order-created';
    const notifySecret = process.env.PABBAS_WHATSAPP_INBOUND_SECRET || process.env.PABBAS_N8N_WEBHOOK_SECRET || '';

    const res = await fetch(notifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pabbas-whatsapp-secret': notifySecret
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error('[notifyOrderCreatedWebhook] Webhook failed:', res.status, await res.text());
    }
    return { success: res.ok };
  } catch (error) {
    console.error('[notifyOrderCreatedWebhook] Error:', error);
    return { success: false };
  }
}
