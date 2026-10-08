const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const extractNode = data.nodes.find(n => n.name === 'Extract Inbound Message');
if (extractNode) console.log(extractNode.parameters.jsCode);
