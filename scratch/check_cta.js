const fs = require('fs');

async function checkCTA() {
  const n8nUrl = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U';
  
  const headers = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  };

  const res = await fetch(n8nUrl, { headers });
  const workflow = await res.json();
  
  const node = workflow.nodes.find(n => n.name === 'Resolve Customer Identity for CTA');
  if (node) {
    console.log(JSON.stringify(node.parameters, null, 2));
  }
}

checkCTA().catch(console.error);
