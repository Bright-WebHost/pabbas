const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
  headers: { 'X-N8N-API-KEY': apiKey }
}).then(r => r.json()).then(w => {
  let foundAdd = false;
  for (const n of w.nodes) {
    if (n.name === 'Cart Add Item') {
      n.parameters.jsonBody = `={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'add', item_name: $json.item.name, quantity: $json.item.quantity }) }}`;
      foundAdd = true;
    }
    if (n.name === 'Cart Remove Item') {
      n.parameters.jsonBody = `={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'remove', item_name: $json.item.name, quantity: $json.item.quantity }) }}`;
    }
  }

  if (foundAdd) console.log('Patched Cart Add Item successfully.');

  return fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
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
    console.error(await r.text());
  } else {
    console.log('Fixed Cart Add Item once and for all!');
  }
});
