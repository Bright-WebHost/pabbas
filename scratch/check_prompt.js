const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const agentNode = data.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
console.log(agentNode.parameters.options.systemMessage);
