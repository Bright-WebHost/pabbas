const fs = require('fs');

async function checkAIWorkflow() {
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  
  const supabaseNodes = data.nodes.filter(n => JSON.stringify(n).includes('SUPABASE') || JSON.stringify(n).includes('supabase'));
  console.log('AI Workflow Supabase nodes:', supabaseNodes.map(n => n.name));
  
  const ycloudNodes = data.nodes.filter(n => JSON.stringify(n).includes('ycloud_api_key') || JSON.stringify(n).includes('ycloud'));
  console.log('AI Workflow YCloud nodes:', ycloudNodes.map(n => n.name));
  
  const secretNodes = data.nodes.filter(n => JSON.stringify(n).includes('secret'));
  console.log('AI Workflow Secret nodes:', secretNodes.map(n => n.name));
}

checkAIWorkflow().catch(console.error);
