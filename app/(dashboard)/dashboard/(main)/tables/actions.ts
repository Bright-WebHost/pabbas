"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type RestaurantTable = {
  id: string;
  table_number: string;
  qr_code_url: string | null;
  is_active: boolean;
  current_order_id: string | null;
  created_at: string;
  orders?: {
    total: number;
    status: string;
    items_json: any;
    customer_name: string | null;
    customer_phone: string | null;
  } | null;
};

export async function fetchTables() {
  try {
    const adminClient = createAdminClient();
    
    // We fetch the table and any associated active order data
    const { data, error } = await adminClient
      .from("restaurant_tables")
      .select(`
        *,
        orders:current_order_id (
          total,
          status,
          items_json,
          customer_name,
          customer_phone
        )
      `)
      .order("table_number", { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return { success: false, error: "Database not migrated yet. Please run the provided SQL script." };
      }
      throw error;
    }
    return { success: true, tables: data as RestaurantTable[] };
  } catch (error: any) {
    console.error("[fetchTables] Error:", error);
    return { success: false, error: "Failed to fetch tables" };
  }
}

export async function addTable(tableNumber: string) {
  try {
    const adminClient = createAdminClient();
    // Use the raw table number for now, we'll generate the full URL dynamically on the client
    // Or we could construct a path if we know the domain. For now, we will just use the table number as a param.
    const { data, error } = await adminClient
      .from("restaurant_tables")
      .insert([{ 
        table_number: tableNumber.trim(),
        is_active: false
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, table: data as RestaurantTable };
  } catch (error: any) {
    console.error("[addTable] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTable(id: string) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("restaurant_tables").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("[deleteTable] Error:", error);
    return { success: false, error: "Failed to delete table" };
  }
}

export async function clearTable(id: string) {
  try {
    const adminClient = createAdminClient();
    
    // 1. Fetch current order id
    const { data: table, error: fetchError } = await adminClient
      .from("restaurant_tables")
      .select("current_order_id")
      .eq("id", id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // 2. Update table
    const { error } = await adminClient
      .from("restaurant_tables")
      .update({ 
        is_active: false,
        current_order_id: null
      })
      .eq("id", id);
      
    if (error) throw error;
    
    // 3. Mark order as delivered & notify customer
    if (table?.current_order_id) {
      const { data: order } = await adminClient
        .from("orders")
        .update({ status: 'delivered' })
        .eq("id", table.current_order_id)
        .select("order_number")
        .single();
        
      if (order?.order_number) {
        const { notifyStatusWebhook } = await import('@/app/(dashboard)/dashboard/(main)/orders/actions');
        await notifyStatusWebhook(order.order_number, 'delivered');
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("[clearTable] Error:", error);
    return { success: false, error: "Failed to clear table" };
  }
}
export async function fetchTableHistory(tableNumber: string) {
  try {
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from("orders")
      .select("id, order_number, total, status, created_at, items_json, customer_name, customer_phone")
      .eq("table_number", tableNumber)
      .in("status", ["delivered", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(20);
      
    if (error) throw error;
    
    return { success: true, history: data };
  } catch (error: any) {
    console.error("[fetchTableHistory] Error:", error);
    return { success: false, error: "Failed to fetch table history" };
  }
}
