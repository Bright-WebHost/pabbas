const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const webhookNode = data.nodes.find(n => n.name === 'Verified YCloud Inbound Webhook');
if (webhookNode) {
  console.log(JSON.stringify(webhookNode.parameters, null, 2));
}
