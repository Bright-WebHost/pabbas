import { getDashboardOrders } from "@/lib/orders/queries";
import OrdersBoard from "./orders/OrdersBoard";

export default async function DashboardPage() {
  const { orders, error } = await getDashboardOrders();
  return <OrdersBoard orders={orders} error={error} />;
}
