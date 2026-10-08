const fs = require('fs');

async function fixWebhook() {
  const n8nUrl = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U';
  
  const headers = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  };

  const res = await fetch(n8nUrl, { headers });
  const workflow = await res.json();
  
  let modified = false;
  
  for (const node of workflow.nodes) {
    if (node.name === 'Verified YCloud Inbound Webhook') {
      if (!node.parameters.options) {
        node.parameters.options = {};
      }
      node.parameters.options.responseMode = 'onReceived';
      node.parameters.options.responseCode = 200;
      modified = true;
      console.log('Successfully applied Respond Immediately fix to Webhook node.');
    }
  }
  
  if (modified) {
    const updateRes = await fetch(n8nUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(workflow)
    });
    
    if (updateRes.ok) {
      console.log('Workflow successfully updated and saved!');
    } else {
      console.error('Failed to save workflow:', await updateRes.text());
    }
  } else {
    console.log('Webhook node already has the fix or was not found.');
  }
}

fixWebhook().catch(console.error);
