const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
const apiKey = apiKeyMatch[1].trim();

let rawW = fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8');
const w = JSON.parse(rawW);

// Replace the Loop node with SplitInBatches
for (let i = 0; i < w.nodes.length; i++) {
  if (w.nodes[i].name === 'Loop Customers') {
    console.log('BEFORE:', JSON.stringify(w.nodes[i], null, 2));
    w.nodes[i] = {
      parameters: {
        batchSize: 1,
        options: {}
      },
      id: w.nodes[i].id,
      name: "Loop Customers",
      type: "n8n-nodes-base.splitInBatches",
      typeVersion: 3,
      position: w.nodes[i].position
    };
    console.log('AFTER:', JSON.stringify(w.nodes[i], null, 2));
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
    console.error("Failed to update n8n:", r.status, await r.text());
    process.exit(1);
  } else {
    const result = await r.json();
    console.log('Successfully replaced Loop node with SplitInBatches. Active:', result.active);
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
