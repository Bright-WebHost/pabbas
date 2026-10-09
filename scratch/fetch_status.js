const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
async function fetchWorkflow() {
  const n8nToken = process.env.N8N_API_KEY;
  const baseUrl = 'https://staff.brightmedia.tech/api/v1/workflows';
  
  const res = await fetch(baseUrl, { headers: { 'X-N8N-API-KEY': n8nToken } });
  const data = await res.json();
  const wf = data.data.find(w => w.name === 'Pabbas | Status Notifier');
  const wfRes = await fetch(baseUrl + '/' + wf.id, { headers: { 'X-N8N-API-KEY': n8nToken } });
  const wfFull = await wfRes.json();
  fs.writeFileSync('scratch/status_notifier.json', JSON.stringify(wfFull, null, 2));
  console.log('Saved');
}
fetchWorkflow();
