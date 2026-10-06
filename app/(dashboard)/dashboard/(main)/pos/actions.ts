"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type PosOrderPayload = {
  customer_name: string;
  customer_phone: string;
  order_type: "takeaway" | "delivery" | "dine-in";
  table_number: string;
  address: string;
  landmark: string;
  pincode: string;
  total: number;
  items_summary: string;
  items_json: Array<{
    menu_item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

export async function createPosOrder(payload: PosOrderPayload) {
  try {
    const adminClient = createAdminClient();

    // Call our newly created atomic RPC
    const { data, error } = await adminClient.rpc("create_pos_order", {
      p_customer_name: payload.customer_name,
      p_customer_phone: payload.customer_phone,
      p_order_type: payload.order_type,
      p_table_number: payload.table_number,
      p_address: payload.address,
      p_landmark: payload.landmark,
      p_pincode: payload.pincode,
      p_total: payload.total,
      p_items_summary: payload.items_summary,
      p_items_json: payload.items_json,
    });

    if (error || !data) {
      console.error("[createPosOrder] RPC error:", error?.message);
      
      if (error?.message?.includes("Could not find the function") || error?.code === 'PGRST202') {
        return { success: false, error: "POS order creation is not configured yet. Please run the required database migration." };
      }

      return { success: false, error: "Failed to create order." };
    }

    return {
      success: true,
      order: {
        id: data.id,
        order_number: data.order_number,
      },
    };
  } catch (error: any) {
    console.error("[createPosOrder] Server action error:", error);
    return { success: false, error: "Internal server error." };
  }
}

export async function updatePosOrder(orderId: string, payload: PosOrderPayload) {
  try {
    const adminClient = createAdminClient();

    // Update order row
    const { error: orderError } = await adminClient.from("orders").update({
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      order_type: payload.order_type,
      table_number: payload.table_number,
      address: payload.address,
      landmark: payload.landmark,
      pincode: payload.pincode,
      total: payload.total,
      items: payload.items_summary,
      items_json: payload.items_json,
      updated_at: new Date().toISOString()
    }).eq("id", orderId);

    if (orderError) throw orderError;

    // Delete old items
    await adminClient.from("order_items").delete().eq("order_id", orderId);

    // Insert new items
    if (payload.items_json && payload.items_json.length > 0) {
      const itemsToInsert = payload.items_json.map(item => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));
      await adminClient.from("order_items").insert(itemsToInsert);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[updatePosOrder] Server action error:", error);
    return { success: false, error: "Failed to update order." };
  }
}
