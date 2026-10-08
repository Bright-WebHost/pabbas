import OrdersBoard from "./orders/OrdersBoard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = "admin";
  if (user && user.email) {
    const { data: staffData } = await supabase
      .from("staff_members")
      .select("role")
      .eq("email", user.email)
      .single();
    if (staffData) role = (staffData as any).role;
  }

  return <OrdersBoard role={role} />;
}
