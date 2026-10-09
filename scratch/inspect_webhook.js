const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('scratch/status_notifier.json', 'utf8'));
const webhookNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
console.log('Webhook Name:', webhookNode.name);
const nextConns = wf.connections[webhookNode.name]?.main?.[0] || [];
console.log('Next nodes after Webhook:', nextConns.map(c => c.node));
