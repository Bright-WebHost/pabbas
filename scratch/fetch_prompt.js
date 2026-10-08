const fs = require('fs');
fetch('https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da', {
  headers: {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(data => {
  fs.writeFileSync('scratch/workflow_current.json', JSON.stringify(data, null, 2));
  const agentNode = data.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  if (agentNode) {
    fs.writeFileSync('scratch/prompt_current.txt', agentNode.parameters.text);
    console.log("Prompt written to scratch/prompt_current.txt");
  }
}).catch(console.error);
