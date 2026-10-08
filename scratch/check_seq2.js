const fs = require('fs');

async function inspectSeq2() {
  const n8nUrl = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U';
  
  const headers = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  };

  const res = await fetch(n8nUrl, { headers });
  const workflow = await res.json();
  
  let current = 'Build Routed Response';
  let path = [current];
  
  while (workflow.connections[current] && workflow.connections[current].main[0]) {
    const nextNode = workflow.connections[current].main[0][0].node;
    if (path.includes(nextNode)) break; // loop
    path.push(nextNode);
    current = nextNode;
  }
  
  console.log('Sequence after Build Routed Response:', path);
}

inspectSeq2().catch(console.error);
