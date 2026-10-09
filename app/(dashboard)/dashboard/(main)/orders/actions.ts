"use server";

import { authorize } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export async function collectCash(orderId: string, expectedAmount: number, receivedAmount: number, riderId?: string) {
  await authorize("collect_cash");

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    // 1. Check if already collected to make it idempotent
    const { data: order, error: fetchError } = await adminClient
      .from("orders")
      .select("is_collected")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      throw new Error("Order not found");
    }
    
    if (order.is_collected) {
      return { success: true }; // Idempotent success
    }

    // 2. Update the order securely
    const { error: orderError } = await adminClient
      .from("orders")
      .update({
        collected_amount: receivedAmount,
        is_collected: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .eq("is_collected", false); // Extra lock

    if (orderError) throw orderError;

    // 3. Update the rider's pending cash and total cash_collected
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
