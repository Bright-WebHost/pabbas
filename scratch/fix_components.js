const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = dotenv.match(/N8N_API_KEY=(.+)/);
const apiKey = apiKeyMatch[1].trim();

let rawW = fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8');
const w = JSON.parse(rawW);

for (const n of w.nodes) {
  if (n.name === 'Extract Params') {
    n.parameters.jsCode = n.parameters.jsCode.replace(
      'header_image: body.header_image || \'\',',
      'components: Array.isArray(body.components) ? body.components : [],'
    );
  }
  
  if (n.name === 'Filter & Clean Phones') {
    n.parameters.jsCode = n.parameters.jsCode.replace(
      'header_image: params.header_image,',
      'components: params.components,'
    );
  }
  
  if (n.name === 'Send Template') {
    n.parameters.jsonBody = "={{ JSON.stringify({\n  to: $json.phone,\n  type: 'template',\n  template: {\n    name: $json.template_name,\n    language: { code: $json.language },\n    components: $json.components || []\n  }\n}) }}";
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
    console.error("Failed to update n8n:", await r.text());
    process.exit(1);
  } else {
    console.log('Successfully fixed components mapping for Send Template');
  }
}).catch(e => {
  console.error("Request failed:", e);
  process.exit(1);
});
