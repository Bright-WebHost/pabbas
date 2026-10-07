const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated.json', 'utf8'));
const node = wf.nodes.find(n => n.name === 'Verify Staff');

// Fix the authorization header expression
const authHeader = node.parameters.headerParameters.parameters.find(p => p.name === 'Authorization');
if (authHeader) {
  authHeader.value = "={{ $json.headers.authorization }}";
}

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated2.json', JSON.stringify(wf, null, 2));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};
fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_payload2.json', JSON.stringify(payload, null, 2));

console.log('Saved payload2');
