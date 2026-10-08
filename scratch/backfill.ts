
import { createAdminClient } from "./lib/supabase/admin";

async function backfill() {
  const supabase = createAdminClient();
  const { data: riders } = await supabase.from("riders").select("id, name");
  if (!riders) return console.log("No riders found");

  for (const rider of riders) {
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("rider_id", rider.id)
      .in("status", ["out_for_delivery", "delivered"]);

    if (count !== null && count > 0) {
      console.log(`Backfilling ${rider.name} with ${count} deliveries`);
      await supabase.from("riders").update({ deliveries_count: count }).eq("id", rider.id);
    }
  }
  console.log("Done");
}
backfill();

