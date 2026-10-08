const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const finalNode = data.nodes.find(n => n.name === 'Place Final Order');
if (finalNode) {
  console.log(JSON.stringify(finalNode.parameters, null, 2));
}
