import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

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

  // Verify staff authorization using service_role on server
  const adminClient = createAdminClient();
  const { data: staffData } = await adminClient
    .from("staff_members")
    .select("email")
    .eq("email", user.email)
    .single();

  if (!staffData) {
    // Authenticated but not authorized as staff
    await supabase.auth.signOut();
    redirect("/dashboard/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
