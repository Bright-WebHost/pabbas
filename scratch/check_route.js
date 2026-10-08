const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const routeNode = data.nodes.find(n => n.name === 'Route Inbound Message');
if (routeNode) {
  console.log(routeNode.parameters.jsCode);
}
