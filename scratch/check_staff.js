const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function checkStaff() {
  const { data, error } = await supabase.from('staff_members').select('*').limit(1);
  console.log(error ? error : data);
}
checkStaff().catch(console.error);
