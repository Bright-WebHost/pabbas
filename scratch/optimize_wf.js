const fs = require('fs');

async function optimizeWorkflow() {
  const n8nUrl = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U';
  
  const headers = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  };

  const res = await fetch(n8nUrl, { headers });
  const workflow = await res.json();
  
  let modified = false;

  // 1. Disconnect Retrieve Chat Context -> Fetch Menu Items
  // Instead: Retrieve Chat Context -> Route Inbound Message
  if (workflow.connections['Retrieve Chat Context'] && workflow.connections['Retrieve Chat Context'].main[0]) {
    workflow.connections['Retrieve Chat Context'].main[0] = [
      {
        "node": "Route Inbound Message",
        "type": "main",
        "index": 0
      }
    ];
    modified = true;
  }

  // 2. Disconnect Fetch Menu Items -> Route Inbound Message
  if (workflow.connections['Fetch Menu Items'] && workflow.connections['Fetch Menu Items'].main[0]) {
    // Re-wire Fetch Menu Items -> Fetch Pending Cart
    workflow.connections['Fetch Menu Items'].main[0] = [
      {
        "node": "Fetch Pending Cart",
        "type": "main",
        "index": 0
      }
    ];
    modified = true;
  }

  // 3. Inbound Route Switch -> Fetch Menu Items (instead of Fetch Pending Cart)
  if (workflow.connections['Inbound Route Switch'] && workflow.connections['Inbound Route Switch'].main[4]) {
    const aiRoute = workflow.connections['Inbound Route Switch'].main[4];
    if (aiRoute[0] && aiRoute[0].node === 'Fetch Pending Cart') {
      aiRoute[0].node = 'Fetch Menu Items';
      modified = true;
    }
  }

  // 4. Update coordinates so it looks nice
  const fetchMenuNode = workflow.nodes.find(n => n.name === 'Fetch Menu Items');
  const routeSwitch = workflow.nodes.find(n => n.name === 'Inbound Route Switch');
  if (fetchMenuNode && routeSwitch) {
    fetchMenuNode.position = [
      routeSwitch.position[0] + 300,
      routeSwitch.position[1] + 200
    ];
  }

  if (modified) {
    const updateData = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData || null
    };
  
    const updateRes = await fetch(n8nUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (updateRes.ok) {
      console.log('Successfully optimized the workflow routing!');
    } else {
      console.error('Failed to save workflow:', await updateRes.text());
    }
  }
}

optimizeWorkflow().catch(console.error);
