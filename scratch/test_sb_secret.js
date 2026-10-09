async function test() {
  const url = 'https://clqzctntkwzahdfjeqlx.supabase.co/rest/v1/messages?select=id&limit=1';
  const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXpjdG50a3d6YWhkZmplcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MzEwOSwiZXhwIjoyMTA1NjM5MTA5fQ.s3acH4jyS7o7JrvHA-qAN2bVmrGDg_7w-ybVxm9CI2M';
  const res = await fetch(url, {
    headers: {
      'apikey': apikey,
      'Authorization': 'Bearer ' + apikey
    }
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
test();
