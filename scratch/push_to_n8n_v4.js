const fs = require('fs');

const url = 'https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da';
const headers = { 
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
  'Content-Type': 'application/json'
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    let us = data.nodes.find(n => n.name === 'Update Status');
    if (us) {
      us.parameters.jsonBody = "={{ JSON.stringify($json.status === 'cancelled' ? { status: $json.status, cancelled_by: 'staff:' + $json.staff, cancelled_at: new Date().toISOString(), cancel_reason: $json.cancel_reason } : ($json.status === 'rider_assigned' ? {} : { status: $json.status })) }}";
    }

    const payload = {
      name: data.name,
      nodes: data.nodes,
      connections: data.connections,
      settings: data.settings || {},
      staticData: data.staticData || null
    };
    
    return fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
  })
  .then(res => res.json())
  .then(data => {
    if (data.id) {
       console.log('Successfully updated workflow with empty object:', data.id);
    } else {
       console.log('Update Error:', data);
    }
  })
