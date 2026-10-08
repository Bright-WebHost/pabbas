const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const memNode = data.nodes.find(n => n.name === 'Redis Chat Memory' || n.type.includes('memory'));
if (memNode) console.log(JSON.stringify(memNode, null, 2));
else console.log('Memory node not found');
