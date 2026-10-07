import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://clqzctntkwzahdfjeqlx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXpjdG50a3d6YWhkZmplcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MzEwOSwiZXhwIjoyMTA1NjM5MTA5fQ.s3acH4jyS7o7JrvHA-qAN2bVmrGDg_7w-ybVxm9CI2M'
)

async function run() {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select(`
      *,
      orders:current_order_id (
        *
      )
    `)
  console.log('Tables:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}

run()
