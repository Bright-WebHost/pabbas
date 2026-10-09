const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
async function updateAllWorkflows() {
  const n8nToken = process.env.N8N_API_KEY;
  const baseUrl = 'https://staff.brightmedia.tech/api/v1/workflows';
  
  const res = await fetch(baseUrl, { headers: { 'X-N8N-API-KEY': n8nToken } });
  const data = await res.json();
  
  const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXpjdG50a3d6YWhkZmplcWx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA2MzEwOSwiZXhwIjoyMTA1NjM5MTA5fQ.s3acH4jyS7o7JrvHA-qAN2bVmrGDg_7w-ybVxm9CI2M';
  const oldKeyRegex = /sb_secret_[a-zA-Z0-9_]+/g;

  let count = 0;
  for (const wfStub of data.data) {
    const wfRes = await fetch(baseUrl + '/' + wfStub.id, { headers: { 'X-N8N-API-KEY': n8nToken } });
    const wfFull = await wfRes.json();
    
    let wfString = JSON.stringify(wfFull);
    if (wfString.match(oldKeyRegex)) {
      wfString = wfString.replace(oldKeyRegex, newKey);
      
      const updatedWf = JSON.parse(wfString);
      
      // Filter out readonly fields
      const payload = {
        name: updatedWf.name,
        nodes: updatedWf.nodes,
        connections: updatedWf.connections,
        settings: updatedWf.settings,
        staticData: updatedWf.staticData,
        pinData: updatedWf.pinData
      };
      
      const updateRes = await fetch(baseUrl + '/' + wfStub.id, {
        method: 'PUT',
        headers: { 
          'X-N8N-API-KEY': n8nToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (updateRes.ok) {
        console.log('Updated workflow:', wfStub.name);
        count++;
      } else {
        console.log('Failed to update:', wfStub.name, await updateRes.text());
      }
    }
  }
  console.log('Done! Updated ' + count + ' workflows.');
}
updateAllWorkflows();
