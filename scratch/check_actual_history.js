const fs = require('fs');
fetch('https://staff.brightmedia.tech/api/v1/executions?workflowId=BfhcbxFiXa4Vga51&limit=2', {
  headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U' }
}).then(res => res.json()).then(async data => {
  if (data && data.data) {
    for (const e of data.data) {
      const execRes = await fetch('https://staff.brightmedia.tech/api/v1/executions/' + e.id, {
        headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U' }
      });
      const execData = await execRes.json();
      
      const reqNode = execData.data.resultData.runData['Build AI Order Request'];
      if (reqNode) {
        const req = reqNode[0].data.main[0][0].json;
        console.log('--- EXEC', e.id, '---');
        console.log('Inbound Text:', req.message);
        console.log('Last 2 History Items:', JSON.stringify(req.context.history.slice(-2), null, 2));
      }
    }
  }
}).catch(console.error);
