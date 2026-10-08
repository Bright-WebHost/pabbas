const url = 'https://staff.brightmedia.tech/api/v1/executions?limit=5';
const headers = { 
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U'
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    if(data.data) {
      data.data.forEach(ex => {
        console.log(`Execution ${ex.id}: ${ex.status} (Workflow: ${ex.workflowId})`);
        if(ex.status === 'error' || ex.status === 'crashed') {
          console.log('Error details:', JSON.stringify(ex.data, null, 2));
        }
      });
    } else {
      console.log('No data:', data);
    }
  })
