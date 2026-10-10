"use server";

import { authorize } from "@/lib/auth/staff";

import { createAdminClient } from "@/lib/supabase/admin";

export type Rider = {
  id: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  deliveries_count: number;
  declines_count: number;
  cash_collected: number;
  pending_cash: number;
  created_at: string;
};

export async function fetchRiders() {
  await authorize("view_riders");

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("riders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    const riders = data as Rider[];

    // Dynamically calculate pending cash from delivered but uncollected orders
    const { data: pendingOrders } = await adminClient
      .from("orders")
      .select("rider_id, total")
      .eq("order_type", "delivery")
      .eq("status", "delivered")
      .eq("is_collected", false)
      .not("rider_id", "is", null);

    if (pendingOrders) {
      riders.forEach(rider => {
        const riderPending = pendingOrders
          .filter(o => o.rider_id === rider.id)
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        
        // Override the database column with the real computed value
        rider.pending_cash = riderPending;
      });
    }

    return { success: true, riders };
  } catch (error: any) {
    console.error("[fetchRiders] Error:", error);
    return { success: false, error: "Failed to fetch riders" };
  }
}

export async function addRider(name: string, whatsapp_number: string) {
  await authorize("manage_riders");

  try {
    const rawNumber = whatsapp_number.replace(/\D/g, ''); // Remove non-digits
    
    // Validate if it's exactly 10 digits (assumes Indian numbers)
    let finalNumber = rawNumber;
    if (rawNumber.length === 10) {
      finalNumber = `91${rawNumber}`;
    } else if (rawNumber.length === 12 && rawNumber.startsWith('91')) {
      finalNumber = rawNumber;
    } else {
      return { success: false, error: "Phone number must be exactly 10 digits (e.g., 9876543210)" };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("riders")
      .insert([{ name: name.trim(), whatsapp_number: finalNumber }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, rider: data as Rider };
  } catch (error: any) {
    console.error("[addRider] Error:", error);
    return { success: false, error: "Failed to add rider" };
  }
}

export async function toggleRiderStatus(id: string, is_active: boolean) {
  await authorize("manage_riders");

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("riders")
      .update({ is_active })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("[toggleRiderStatus] Error:", error);
    return { success: false, error: "Failed to update rider status" };
  }
}

export async function settlePendingCash(id: string) {
  await authorize("manage_riders");

  try {
    const adminClient = createAdminClient();

    // Mark all delivered uncollected orders for this rider as collected
    const { error: ordersError } = await adminClient
      .from("orders")
      .update({ is_collected: true, updated_at: new Date().toISOString() })
      .eq("rider_id", id)
      .eq("order_type", "delivery")
      .eq("status", "delivered")
      .eq("is_collected", false);

    if (ordersError) throw ordersError;

    // Reset rider pending cash column just in case
    const { error: riderError } = await adminClient
      .from("riders")
      .update({ pending_cash: 0 })
      .eq("id", id);

    if (riderError) throw riderError;

    return { success: true };
  } catch (error: any) {
    console.error("[settlePendingCash] Error:", error);
    return { success: false, error: "Failed to settle cash" };
  }
}
