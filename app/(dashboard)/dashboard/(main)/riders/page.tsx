import { requirePage } from "@/lib/auth/staff";
import RidersBoard from "./RidersBoard";

export const metadata = {
  title: "Riders | Pabbas",
};

export default async function RidersPage() {
  await requirePage("/dashboard/riders");

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 bg-[#F8FAFB]">
      <RidersBoard />
    </div>
  );
}
