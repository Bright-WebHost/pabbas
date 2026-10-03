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
