const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
  headers: { 'X-N8N-API-KEY': apiKey }
}).then(r => r.json()).then(w => {
  for (const n of w.nodes) {
    if (n.name === 'Cart Add Item') {
      n.parameters.jsonBody = `={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'add', item_name: $json.item.name, quantity: $json.item.quantity }) }}`;
    }
    if (n.name === 'Cart Remove Item') {
      n.parameters.jsonBody = `={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'remove', item_name: $json.item.name, quantity: $json.item.quantity }) }}`;
    }
    if (n.name === 'Confirm Order') {
      n.parameters.jsCode = `const orderData = $('Place Final Order').first().json || {};
const validateData = $('Validate Menu And Price').first().json || {};
return [{
  json: {
    customer_phone: validateData.customer_phone,
    customer_name: validateData.customer_name,
    channel_user_id: validateData.channel_user_id,
    action: 'reply',
    reply: \`Awesome! Your order #\${orderData.order_number || ''} has been successfully placed 🎉\\n\\nOur team is preparing it right now!\`,
    order_number: orderData.order_number
  }
}];`;
    }
  }

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
    console.log('Successfully pushed the ultimate fix to n8n!');
  }
});
