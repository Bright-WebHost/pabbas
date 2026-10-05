const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
const anonKeyMatch = dotenv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
if (!apiKeyMatch) throw new Error("N8N_API_KEY not found");
if (!anonKeyMatch) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not found");

const apiKey = apiKeyMatch[1].trim();
const anonKey = anonKeyMatch[1].trim();
const supabaseUrl = "https://clqzctntkwzahdfjeqlx.supabase.co";

const w = JSON.parse(fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8'));

for (const n of w.nodes) {
  if (n.name === 'Verify Staff') {
    n.parameters.url = `${supabaseUrl}/rest/v1/rpc/staff_check`;
    if (n.parameters.headerParameters && n.parameters.headerParameters.parameters) {
      for (const h of n.parameters.headerParameters.parameters) {
        if (h.name === 'apikey') {
          h.value = anonKey;
        }
        if (h.name === 'Authorization') {
          h.value = `={{ $json.headers.authorization || "Bearer ${anonKey}" }}`;
        }
      }
    }
  }
}

fs.writeFileSync('n8n/workflows/Pabbas _ Blast Sender.json', JSON.stringify(w, null, 2));

fetch("https://staff.brightmedia.tech/api/v1/workflows/" + w.id, {
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: w.name,
    nodes: w.nodes,
    connections: w.connections,
    settings: w.settings
  })
}).then(async r => {
  if (!r.ok) {
    console.error("Failed to update n8n:", await r.text());
    process.exit(1);
  } else {
    console.log('Successfully fixed Verify Staff node env variables');
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
