const dotenv = require('fs').readFileSync('.env.local', 'utf-8');
const secretKeyMatch = dotenv.match(/SUPABASE_SECRET_KEY=(.+)/);
const secretKey = secretKeyMatch[1].trim();
const supabaseUrl = "https://clqzctntkwzahdfjeqlx.supabase.co";

fetch(`${supabaseUrl}/rest/v1/customers?opted_out=eq.false&select=phone,name,total_orders,last_order_date`, {
  headers: {
    'apikey': secretKey,
    'Authorization': `Bearer ${secretKey}`
  }
}).then(r => r.json()).then(data => {
  console.log("Customers count:", Array.isArray(data) ? data.length : data);
  if (Array.isArray(data) && data.length > 0) {
    console.log("Sample customer:", data[0]);
  }
}).catch(console.error);
