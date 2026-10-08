const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
  headers: { 'X-N8N-API-KEY': apiKey }
}).then(r => r.json()).then(w => {
  for (const n of w.nodes) {
    if (n.name === 'Build Outbound Message') {
      n.parameters.jsCode = n.parameters.jsCode.replace(
        /What are you craving today\? 😋\\n\\n/, 
        ''
      );
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
    console.log('Removed "What are you craving today?" from the welcome message!');
  }
});
