const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
async function fetchWorkflow() {
  const n8nToken = process.env.N8N_API_KEY;
  const res = await fetch('https://staff.brightmedia.tech/api/v1/workflows', {
    headers: { 'X-N8N-API-KEY': n8nToken }
  });
  const data = await res.json();
  const wf = data.data.find(w => w.name === 'Pabbas | Production | WhatsApp AI Order Bridge');
  
  const wfRes = await fetch('https://staff.brightmedia.tech/api/v1/workflows/' + wf.id, {
    headers: { 'X-N8N-API-KEY': n8nToken }
  });
  const wfData = await wfRes.json();
  fs.writeFileSync('scratch/wf_whatsapp_ai.json', JSON.stringify(wfData, null, 2));
  console.log('Saved to scratch/wf_whatsapp_ai.json');
}
fetchWorkflow();
