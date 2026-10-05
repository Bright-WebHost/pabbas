const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
if (!apiKeyMatch) throw new Error("N8N_API_KEY not found");
const n8nKey = apiKeyMatch[1].trim();

const supabaseSecretMatch = dotenv.match(/SUPABASE_SECRET_KEY=(.+)/);
const supabaseSecret = supabaseSecretMatch[1].trim();

let rawW = fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8');
const w = JSON.parse(rawW);

for (const n of w.nodes) {
  if (n.type === 'n8n-nodes-base.httpRequest' && n.parameters.url && n.parameters.url.includes('supabase.co')) {
    // Remove custom credentials
    if (n.parameters.authentication === 'predefinedCredentialType' || n.credentials) {
      n.parameters.authentication = 'none';
      delete n.parameters.nodeCredentialType;
      delete n.credentials;
    }

    // Ensure headers exist
    n.parameters.sendHeaders = true;
    if (!n.parameters.headerParameters) {
      n.parameters.headerParameters = { parameters: [] };
    }
    
    // Add apikey and Authorization if missing
    let hasApiKey = false;
    let hasAuth = false;
    for (const h of n.parameters.headerParameters.parameters) {
      if (h.name.toLowerCase() === 'apikey') {
        h.value = supabaseSecret;
        hasApiKey = true;
      }
      if (h.name.toLowerCase() === 'authorization') {
        // If it's the Verify Staff node, we might want to keep its dynamic auth logic.
        // But the previous fix hardcoded it to anonKey for Verify Staff. Let's just use service role for everything.
        h.value = `Bearer ${supabaseSecret}`;
        hasAuth = true;
      }
    }
    
    if (!hasApiKey) {
      n.parameters.headerParameters.parameters.push({ name: 'apikey', value: supabaseSecret });
    }
    if (!hasAuth) {
      n.parameters.headerParameters.parameters.push({ name: 'Authorization', value: `Bearer ${supabaseSecret}` });
    }
  }
}

fs.writeFileSync('n8n/workflows/Pabbas _ Blast Sender.json', JSON.stringify(w, null, 2));

fetch("https://staff.brightmedia.tech/api/v1/workflows/" + w.id, {
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': n8nKey,
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
    console.log('Successfully injected explicit auth headers into all Supabase nodes');
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
