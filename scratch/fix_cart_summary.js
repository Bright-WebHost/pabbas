const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('debug_bridge.json', 'utf-8'));

for (const n of w.nodes) {
  // Update Cart replies to properly parse the API response
  if (n.name === 'Build Add Reply' || n.name === 'Build Rem Reply') {
    n.parameters.jsCode = `const first = $input.first().json; 
// The HTTP node replaces the JSON with the API response, which has 'items' and 'total' at the root!
const items = first.items || [];
let lines = items.map(i => \`- \${i.item_name || i.name} x\${i.quantity}\`).join('\\n');
if (!lines) lines = 'Your cart is empty.';
const reply = (first.ai_reply || "I've updated your cart!") + \`\\n\\n*Current Order:*\\n\${lines}\\n*Total:* ₹\${first.total || 0}\\n\\nWould you like to add anything else or place the order?\`;
return [{json:{...first, reply}}];`;
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
    console.log('Fixed Cart Summary Bug in Build Add/Rem Reply');
  }
});
