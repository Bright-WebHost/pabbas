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
      console.error(`Status Notifier Webhook failed with status ${response.status}: ${errText}`);
      return { success: false, error: `Webhook returned error ${response.status}` };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to call Status Notifier Webhook:", error);
    return { success: false, error: error.message };
  }
}

export async function collectCash(orderId: string, expectedAmount: number, receivedAmount: number, riderId?: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    // 1. Update the order
    const { error: orderError } = await adminClient
      .from("orders")
      .update({
        collected_amount: receivedAmount,
        is_collected: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (orderError) throw orderError;

    // 2. Update the rider's pending cash and total cash_collected
    if (riderId) {
      const { data: rider, error: fetchRiderError } = await adminClient
        .from("riders")
        .select("pending_cash, cash_collected")
        .eq("id", riderId)
        .single();
        
      if (!fetchRiderError && rider) {
        const shortPay = expectedAmount - receivedAmount;
        const newPending = (Number(rider.pending_cash) || 0) + Math.max(0, shortPay);
        const newCollected = (Number(rider.cash_collected) || 0) + receivedAmount;

        await adminClient
          .from("riders")
          .update({ 
            pending_cash: newPending,
            cash_collected: newCollected
          })
          .eq("id", riderId);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to collect cash:", error);
    return { success: false, error: error.message };
  }
}
