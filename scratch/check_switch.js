const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const switchNodeId = data.nodes.find(n => n.name === 'Order Action Switch').name;
console.log(JSON.stringify(data.connections[switchNodeId] || data.connections['Order Action Switch'], null, 2));
