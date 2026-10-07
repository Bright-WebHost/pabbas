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
    
    const { data, error } = await adminClient
      .from("restaurant_tables")
      .select("*")
      .order("table_number", { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return { success: false, error: "Database not migrated yet. Please run the provided SQL script." };
      }
      throw error;
    }

    // Fetch active dine-in orders dynamically to prevent sync issues
    const { data: activeOrders, error: activeOrdersError } = await adminClient
      .from("orders")
      .select("id, total, status, items_json, customer_name, customer_phone, table_number")
      .eq("order_type", "dine-in")
      .in("status", ["new", "preparing", "ready_for_pickup"]);

    if (activeOrdersError) {
      console.error("[fetchTables] Error fetching active orders:", activeOrdersError);
    }

    const tables = (data as any[]).map(t => {
      // Find active order for this table
      // In case there are multiple, sort by created_at or just take the first
      const activeOrder = activeOrders?.find((o: any) => o.table_number === t.table_number);
      
      return {
        ...t,
        is_active: !!activeOrder,
        current_order_id: activeOrder ? activeOrder.id : null,
        orders: activeOrder ? {
          total: activeOrder.total,
          status: activeOrder.status,
          items_json: activeOrder.items_json,
          customer_name: activeOrder.customer_name,
          customer_phone: activeOrder.customer_phone
        } : null
      } as RestaurantTable;
    });

    return { success: true, tables };
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
    
    // 1. Fetch table details
    const { data: table, error: fetchError } = await adminClient
      .from("restaurant_tables")
      .select("table_number, current_order_id")
      .eq("id", id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Find active order if not set on the table
    let orderIdToClear = table?.current_order_id;
    if (!orderIdToClear && table?.table_number) {
      const { data: activeOrder } = await adminClient
        .from("orders")
        .select("id")
        .eq("order_type", "dine-in")
        .eq("table_number", table.table_number)
        .in("status", ["new", "preparing", "ready_for_pickup"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (activeOrder) {
        orderIdToClear = activeOrder.id;
      }
    }

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
    if (orderIdToClear) {
      const { data: order } = await adminClient
        .from("orders")
        .update({ status: 'delivered' })
        .eq("id", orderIdToClear)
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
