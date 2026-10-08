const dotenv = require('fs').readFileSync('.env.local', 'utf-8');
const secretKeyMatch = dotenv.match(/SUPABASE_SECRET_KEY=(.+)/);
const secretKey = secretKeyMatch[1].trim();
const supabaseUrl = "https://clqzctntkwzahdfjeqlx.supabase.co";

fetch(`${supabaseUrl}/rest/v1/blast_log?select=*&order=created_at.desc&limit=5`, {
  headers: {
    'apikey': secretKey,
    'Authorization': `Bearer ${secretKey}`
  }
}).then(r => r.json()).then(console.log).catch(console.error);
