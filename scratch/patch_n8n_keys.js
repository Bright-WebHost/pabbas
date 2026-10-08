const fs = require('fs');

async function patchWorkflows() {
  const n8nUrl = 'https://staff.brightmedia.tech/api/v1/workflows';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U';
  
  const headers = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  };

  const oldSupa = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXpjdG50a3d6YWhkZmplcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MzEwOSwiZXhwIjoyMTA1NjM5MTA5fQ.s3acH4jyS7o7JrvHA-qAN2bVmrGDg_7w-ybVxm9CI2M';
  const newSupa = 'sb_secret_iLPBIA6myl_50JnaOakIMA_RX9EsENM';
  
  const oldYcloud = 'd5502caecd15e608b38bb515f76d5f35';
  const newYcloud = '6596d7172f705edbe0f0f104b3e2b9d6';

  const res = await fetch(n8nUrl, { headers });
  const data = await res.json();
  
  for (const wf of data.data) {
    console.log(`Checking workflow: ${wf.name} (${wf.id})`);
    const detailRes = await fetch(`${n8nUrl}/${wf.id}`, { headers });
    const detail = await detailRes.json();
    
    let wfStr = JSON.stringify(detail);
    if (wfStr.includes(oldSupa) || wfStr.includes(oldYcloud)) {
      console.log(`  -> Found old keys in ${wf.name}, patching...`);
      // Global replace old -> new
      wfStr = wfStr.split(oldSupa).join(newSupa);
      wfStr = wfStr.split(oldYcloud).join(newYcloud);
      
      const payload = JSON.parse(wfStr);
      const updateData = {
        name: payload.name,
        nodes: payload.nodes,
        connections: payload.connections,
        settings: payload.settings || {},
        staticData: payload.staticData || null
      };
      
      const updateRes = await fetch(`${n8nUrl}/${wf.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });
      const updateJson = await updateRes.json();
      console.log(`  -> Successfully patched ${updateJson.name}`);
    }
  }
}
patchWorkflows().catch(console.error);
