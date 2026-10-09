const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('scratch/wf_whatsapp_ai.json', 'utf8'));
const node = wf.nodes.find(n => n.name === 'Look Up Message ID');
console.log(JSON.stringify(node, null, 2));
