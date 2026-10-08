const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
if (!apiKeyMatch) throw new Error("N8N_API_KEY not found");
const apiKey = apiKeyMatch[1].trim();

const w = JSON.parse(fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8'));

for (const n of w.nodes) {
  if (n.name === 'Extract Params') {
    n.parameters.jsCode = `const body = $input.first().json.body || {};
return [{
  json: {
    run_id: 'blast_' + Date.now(),
    filter: body.filter || 'all',
    template_name: body.template_name || '',
    language: body.language || 'en',
    header_image: body.header_image || '',
    ycloud_api_key: body.ycloud_api_key || '',
    phones: Array.isArray(body.phones) ? body.phones : []
  }
}];`;
  }

  if (n.name === 'Filter & Clean Phones') {
    n.parameters.jsCode = `const params = $('Extract Params').first().json;
const dbCustomers = $input.all().map(i => i.json) || [];
const explicitPhones = params.phones || [];

let targetPhones = [];
if (explicitPhones.length > 0) {
  targetPhones = explicitPhones;
} else {
  const now = Date.now();
  targetPhones = dbCustomers.filter(c => {
    if (params.filter === 'repeat' && c.total_orders < 2) return false;
    if (params.filter === 'active_30') {
      if (!c.last_order_date) return false;
      const days = (now - new Date(c.last_order_date).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 30) return false;
    }
    return true;
  }).map(c => c.phone);
}

const unique = [...new Set(targetPhones.map(p => String(p).replace(/[^0-9]/g, '')).filter(Boolean))];

return unique.map(p => ({
  json: {
    phone: p,
    template_name: params.template_name,
    language: params.language,
    header_image: params.header_image,
    ycloud_api_key: params.ycloud_api_key
  }
}));`;
  }

  if (n.name === 'Send Template') {
    // Check headers, update API key
    if (n.parameters.headerParameters && n.parameters.headerParameters.parameters) {
      for (const h of n.parameters.headerParameters.parameters) {
        if (h.name === 'X-API-Key') {
          h.value = '={{ $json.ycloud_api_key || "d5502caecd15e608b38bb515f76d5f35" }}';
        }
      }
    }
  }

  if (n.name === 'Parse Send Result') {
    n.parameters.jsCode = `const req = $input.first().json || {};
const phone = $('Loop Customers').item.json.phone;

return [{
  json: {
    phone: phone,
    blast_status: req.error ? 'failed' : 'sent',
    blast_message_id: req.id || req.message_id || 'msg_' + Date.now(),
    blast_sent_at: new Date().toISOString(),
    blast_error: req.error ? JSON.stringify(req.error) : null
  }
}];`;
  }

  if (n.name === 'Log Blast') {
    n.parameters.jsonBody = `={{ JSON.stringify({ 
  run_id: $('Extract Params').first().json.run_id, 
  phone: $json.phone, 
  status: $json.blast_status, 
  message_id: $json.blast_message_id, 
  error: $json.blast_error 
}) }}`;
  }
}

// Write the modified workflow back to the file
fs.writeFileSync('n8n/workflows/Pabbas _ Blast Sender.json', JSON.stringify(w, null, 2));

// Push the update to n8n
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
    console.log('Updated n8n Blast Sender successfully with proper API Key logic and node references');
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
