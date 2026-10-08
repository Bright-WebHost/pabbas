const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const validateNode = data.nodes.find(n => n.name === 'Validate Menu And Price');
if (validateNode) {
  console.log(validateNode.parameters.jsCode);
}
