const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
const apiKey = apiKeyMatch[1].trim();

// Fetch the LIVE workflow from n8n to get current state
fetch("https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x", {
  headers: { 'X-N8N-API-KEY': apiKey }
}).then(r => r.json()).then(w => {
  // Strategy: Remove the Loop node entirely.
  // Instead, make Filter & Clean Phones output individual items directly,
  // and Send Template will process each item automatically (n8n processes all items).
  // The Throttle 1s Wait node is also problematic since it expects a loop.
  // 
  // New flow:
  // Filter & Clean Phones → Send Template → Parse Send Result → Log Blast → Update Customer → Done
  // No loop needed — n8n naturally processes all items from the Code node output.

  // Remove Loop Customers, Throttle 1s, and Done nodes
  w.nodes = w.nodes.filter(n => 
    n.name !== 'Loop Customers' && 
    n.name !== 'Throttle 1s' && 
    n.name !== 'Done'
  );

  // Update connections:
  // Filter & Clean Phones → Send Template (directly)
  // Send Template → Parse Send Result → Log Blast → Update Customer (no more Throttle/Loop)
  w.connections = {
    "Blast Webhook": {
      "main": [[{ "node": "Verify Staff", "type": "main", "index": 0 }]]
    },
    "Verify Staff": {
      "main": [[{ "node": "Is Staff?", "type": "main", "index": 0 }]]
    },
    "Is Staff?": {
      "main": [
        [{ "node": "Extract Params", "type": "main", "index": 0 }],
        []
      ]
    },
    "Extract Params": {
      "main": [[{ "node": "Get Customers", "type": "main", "index": 0 }]]
    },
    "Get Customers": {
      "main": [[{ "node": "Filter & Clean Phones", "type": "main", "index": 0 }]]
    },
    "Filter & Clean Phones": {
      "main": [[{ "node": "Send Template", "type": "main", "index": 0 }]]
    },
    "Send Template": {
      "main": [[{ "node": "Parse Send Result", "type": "main", "index": 0 }]]
    },
    "Parse Send Result": {
      "main": [[{ "node": "Log Blast", "type": "main", "index": 0 }]]
    },
    "Log Blast": {
      "main": [[{ "node": "Update Customer", "type": "main", "index": 0 }]]
    }
  };

  // Also fix the Parse Send Result node — it references $('Loop Customers') which no longer exists
  // Change it to use $input instead
  for (const n of w.nodes) {
    if (n.name === 'Parse Send Result') {
      n.parameters.jsCode = `const req = $input.first().json || {};
const phone = $('Filter & Clean Phones').item.json.phone;

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
  }

  // Save locally
  fs.writeFileSync('n8n/workflows/Pabbas _ Blast Sender.json', JSON.stringify(w, null, 2));

  // Push to n8n
  return fetch("https://staff.brightmedia.tech/api/v1/workflows/" + w.id, {
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
  });
}).then(async r => {
  if (!r.ok) {
    console.error("Failed to update n8n:", r.status, await r.text());
    process.exit(1);
  } else {
    const result = await r.json();
    console.log('SUCCESS: Removed Loop node. Direct pipeline: Filter → Send → Parse → Log → Update');
    console.log('Active:', result.active);
    console.log('Nodes:', result.nodes.map(n => n.name).join(' → '));
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
