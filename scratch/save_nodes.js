const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));

const routeNode = data.nodes.find(n => n.name === 'Route Inbound Message');
const buildNode = data.nodes.find(n => n.name === 'Build Outbound Message');
const valNode = data.nodes.find(n => n.name === 'Validate Menu And Price');

fs.writeFileSync('scratch/current_route.js', routeNode.parameters.jsCode);
fs.writeFileSync('scratch/current_build.js', buildNode.parameters.jsCode);
fs.writeFileSync('scratch/current_val.js', valNode.parameters.jsCode);
console.log('Saved to scratch');
