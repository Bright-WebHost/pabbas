const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('debug_bridge.json', 'utf-8'));

for (const n of w.nodes) {
  if (n.name === 'Cart Add Item') {
    n.parameters.jsonBody = `={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'add', item_name: $json.item.name, quantity: $json.item.quantity }) }}`;
  }
  if (n.name === 'Cart Remove Item') {
    n.parameters.jsonBody = `={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'remove', item_name: $json.item.name, quantity: $json.item.quantity }) }}`;
  }
}

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
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
    console.error(await r.text());
  } else {
    console.log('Fixed n8n Cart Add/Remove to use item_name');
  }
});
