const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = envContent.split(/\r?\n/).reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^"|"$/g, '');
    acc[key] = val;
  }
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SECRET_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'];

console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
  const { data: riders, error: riderErr } = await supabase.from('riders').select('id, name');
  if (riderErr) {
    console.error(riderErr);
    return;
  }
  if (!riders) return console.log('No riders found');

  let updated = 0;
  for (const rider of riders) {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', rider.id)
      .in('status', ['out_for_delivery', 'delivered']);

    if (error) {
      console.error(error);
      continue;
    }

    if (count !== null && count > 0) {
      console.log(`Backfilling ${rider.name} with ${count} deliveries`);
      await supabase.from('riders').update({ deliveries_count: count }).eq('id', rider.id);
      updated++;
    }
  }
  console.log(`Done, updated ${updated} riders`);
}
backfill();
