
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfill() {
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

