import { createAdminClient } from "@/lib/supabase/admin";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface DashboardOrderItem {
  id: string;
  item_name_snapshot: string;
  variant_name_snapshot: string | null;
  quantity: number;
  line_total_paise: number;
}

export interface DashboardOrder {
  id: string;
  order_number: string;
  order_type: "delivery" | "pickup" | "dine-in";
  order_status: OrderStatus;
  payment_status: "pending" | "paid" | "failed";
  payment_method: "upi" | "cash" | "online";
  total_paise: number;
  customer_name_snapshot: string;
  customer_phone_snapshot: string;
  delivery_address_snapshot: string | null;
  landmark_snapshot: string | null;
  pincode_snapshot: string | null;
  table_id: string | null;
  scheduled_time: string | null;
  created_at: string;
  updated_at: string;
  items: DashboardOrderItem[];
}

export async function getDashboardOrders(): Promise<{
  orders: DashboardOrder[];
  error: string | null;
}> {
  try {
    const adminClient = createAdminClient();
    const { data: orderRows, error: ordersError } = await adminClient
      .from("orders")
      .select(
        "id, order_number, order_type, order_status, payment_status, payment_method, total_paise, customer_name_snapshot, customer_phone_snapshot, delivery_address_snapshot, landmark_snapshot, pincode_snapshot, table_id, scheduled_time, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (ordersError) {
      return { orders: [], error: "Orders could not be loaded." };
    }

    const rows = (orderRows ?? []) as Array<Omit<DashboardOrder, "items">>;
    if (rows.length === 0) {
      return { orders: [], error: null };
    }

    const orderIds = rows.map((order) => order.id);
    const { data: itemRows, error: itemsError } = await adminClient
      .from("order_items")
      .select("id, order_id, item_name_snapshot, variant_name_snapshot, quantity, line_total_paise")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (itemsError) {
      return { orders: [], error: "Order items could not be loaded." };
    }

    const itemsByOrder = new Map<string, DashboardOrderItem[]>();
    for (const item of itemRows ?? []) {
      const orderItems = itemsByOrder.get(item.order_id) ?? [];
      orderItems.push({
        id: item.id,
        item_name_snapshot: item.item_name_snapshot,
        variant_name_snapshot: item.variant_name_snapshot,
        quantity: item.quantity,
        line_total_paise: item.line_total_paise,
      });
      itemsByOrder.set(item.order_id, orderItems);
    }

    return {
      orders: rows.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) ?? [],
      })),
      error: null,
    };
  } catch {
    return { orders: [], error: "Orders could not be loaded." };
  }
}