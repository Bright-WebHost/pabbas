import { getDashboardOrders } from "@/lib/orders/queries";
import OrdersBoard from "./OrdersBoard";

export default async function OrdersPage() {
  const { orders, error } = await getDashboardOrders();
  return <OrdersBoard orders={orders} error={error} />;
}