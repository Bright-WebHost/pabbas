const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const buildAiNode = data.nodes.find(n => n.name === 'Build AI Order Request');
if (buildAiNode) console.log(buildAiNode.parameters.jsCode);
