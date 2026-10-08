const fs = require('fs');
fetch('https://staff.brightmedia.tech/api/v1/executions?workflowId=BfhcbxFiXa4Vga51&limit=1', {
  headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U' }
}).then(res => res.json()).then(async data => {
  if (data && data.data) {
    const execRes = await fetch('https://staff.brightmedia.tech/api/v1/executions/' + data.data[0].id, {
      headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U' }
    });
    const execData = await execRes.json();
    const reqNode = execData.data.resultData.runData['Build AI Order Request'];
    if (reqNode) {
      const cart = reqNode[0].data.main[0][0].json.context.pending_cart;
      console.log('Cart Items:', JSON.stringify(cart.items, null, 2));
    }
  }
}).catch(console.error);
