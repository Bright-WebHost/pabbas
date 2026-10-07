const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated.json', 'utf8'));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_payload.json', JSON.stringify(payload, null, 2));
console.log('Saved payload');
