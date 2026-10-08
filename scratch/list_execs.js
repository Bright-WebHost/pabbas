const fs = require('fs');
fetch('https://staff.brightmedia.tech/api/v1/executions?workflowId=BfhcbxFiXa4Vga51&limit=5', {
  headers: {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U'
  }
}).then(res => res.json()).then(data => {
  if (data && data.data) {
    data.data.forEach(e => console.log('Exec: ' + e.id + ' at ' + e.createdAt));
  }
}).catch(console.error);
