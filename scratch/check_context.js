const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
async function run() {
  const { data, error } = await supabase.rpc('chat_context', {
    p_phone: '+919035960307',
    p_order: null
  });
  console.log('Error:', error);
  console.log('Data keys:', data ? Object.keys(data) : null);
  if (data) {
    console.log('History:', data.history);
  }
}
run();
