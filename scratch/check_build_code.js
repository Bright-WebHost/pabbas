const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const buildNode = data.nodes.find(n => n.name === 'Build Outbound Message');
if (buildNode) {
  console.log(buildNode.parameters.jsCode);
}
