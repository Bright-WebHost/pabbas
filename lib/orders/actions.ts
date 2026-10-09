"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function updateOrderInDb(orderId: string, updates: any) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) {
      console.error("[updateOrderInDb] Error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[updateOrderInDb] Exception:", err.message);
    return { success: false, error: err.message };
  }
}
