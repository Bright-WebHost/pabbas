const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('create_order_atomic', {});
  console.log("create_order_atomic:", error ? error.message : "Exists!");
  
  const { data: d2, error: e2 } = await supabase.rpc('create_order', {});
  console.log("create_order:", e2 ? e2.message : "Exists!");
}
check();
