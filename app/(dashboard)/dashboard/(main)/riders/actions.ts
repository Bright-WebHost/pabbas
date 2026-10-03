"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type Rider = {
  id: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  deliveries_count: number;
  cash_collected: number;
  created_at: string;
};

export async function fetchRiders() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("riders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, riders: data as Rider[] };
  } catch (error: any) {
    console.error("[fetchRiders] Error:", error);
    return { success: false, error: "Failed to fetch riders" };
  }
}

export async function addRider(name: string, whatsapp_number: string) {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("riders")
      .insert([{ name: name.trim(), whatsapp_number: whatsapp_number.trim() }])
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
