const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function check() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
