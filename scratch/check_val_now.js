const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const valNode = data.nodes.find(n => n.name === 'Validate Menu And Price');
if (valNode) console.log(valNode.parameters.jsCode);
