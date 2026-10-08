const fs = require('fs');
fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
  headers: {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U'
  }
}).then(res => res.json()).then(data => {
  fs.writeFileSync('scratch/ai_workflow.json', JSON.stringify(data, null, 2));
  const agentNode = data.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  if (agentNode) {
    fs.writeFileSync('scratch/ai_prompt.txt', agentNode.parameters.text);
    console.log("Prompt written to scratch/ai_prompt.txt");
  } else {
    console.log("No agent node found.");
  }
}).catch(console.error);
