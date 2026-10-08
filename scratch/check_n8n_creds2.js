const fs = require('fs');

async function inspectNodes2() {
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  
  const sampleSupabase = data.nodes.find(n => n.name === 'Save Inbound Message');
  if (sampleSupabase) console.log('Supabase Node details:', JSON.stringify(sampleSupabase, null, 2));
}

inspectNodes2().catch(console.error);
