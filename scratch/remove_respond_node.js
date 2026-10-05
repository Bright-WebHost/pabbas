const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
if (!apiKeyMatch) throw new Error("N8N_API_KEY not found");
const apiKey = apiKeyMatch[1].trim();

const w = JSON.parse(fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8'));

// Delete the "Respond Unauthorised" node
w.nodes = w.nodes.filter(n => n.name !== 'Respond Unauthorised');

// Remove connections to it
if (w.connections['Is Staff?'] && w.connections['Is Staff?'].main) {
  w.connections['Is Staff?'].main = w.connections['Is Staff?'].main.map(path => {
    if (!path) return path;
    return path.filter(c => c.node !== 'Respond Unauthorised');
  });
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
    console.log('Successfully removed unused Respond Unauthorised node');
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
