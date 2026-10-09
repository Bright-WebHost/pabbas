import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { getStaffSession } from "@/lib/auth/staff";
import { StaffProvider } from "@/components/providers/StaffProvider";
import { redirect } from "next/navigation";
import { OrderManagerProvider } from "../OrderManagerProvider";
import { GlobalNewOrderPopup } from "../GlobalNewOrderPopup";
import GlobalAssignRiderPopup from "../GlobalAssignRiderPopup";
import { getDashboardOrders } from "@/lib/orders/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffSession();

  if (!staff) {
    // If not authenticated or unauthorized
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/dashboard/login?error=unauthorized");
  }

  // Pre-fetch initial orders for the provider
  const { orders: initialOrders } = await getDashboardOrders();

  return (
    <StaffProvider staff={staff}>
      <OrderManagerProvider initialOrders={initialOrders}>
      <div className="flex min-h-screen bg-[#F8FAFB] text-[#0A1017]">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 pb-[64px] md:pb-0">
          <div className="print:hidden">
            <Header />
          </div>
          <main className="flex-1 px-4 md:px-6 pb-6 overflow-x-hidden print:p-0 print:overflow-visible print:bg-white print:m-0">
            {children}
          </main>
        </div>
      </div>
      <GlobalNewOrderPopup />
      <GlobalAssignRiderPopup />
    </OrderManagerProvider>
    </StaffProvider>
  );
}
