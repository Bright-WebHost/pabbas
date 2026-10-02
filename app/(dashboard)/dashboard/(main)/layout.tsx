import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderManagerProvider } from "../OrderManagerProvider";
import { GlobalNewOrderPopup } from "../GlobalNewOrderPopup";
import { getDashboardOrders } from "@/lib/orders/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/dashboard/login");
  }

  // Verify staff authorization using authenticated client on server
  const { data: staffData } = await supabase
    .from("staff_members")
    .select("email")
    .eq("email", user.email)
    .single();

  if (!staffData) {
    // Authenticated but not authorized as staff
    await supabase.auth.signOut();
    redirect("/dashboard/login?error=unauthorized");
  }

  // Pre-fetch initial orders for the provider
  const { orders: initialOrders } = await getDashboardOrders();

  return (
    <OrderManagerProvider initialOrders={initialOrders}>
      <div className="flex min-h-screen bg-[#F8FAFB] text-[#0A1017]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-[64px] md:pb-0">
          <Header />
          <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
      <GlobalNewOrderPopup />
    </OrderManagerProvider>
  );
}
