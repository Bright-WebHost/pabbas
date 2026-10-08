const fs = require('fs');

async function patch() {
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  
  const buildNode = data.nodes.find(n => n.name === 'Build Outbound Message');
  if (buildNode) {
    let jsCode = buildNode.parameters.jsCode;
    // Fix emojis replacing ???
    jsCode = jsCode.replace(/\?\?\? Order on WhatsApp/g, '🛍️ Order on WhatsApp');
    jsCode = jsCode.replace(/\?\?\? Explore Menu/g, '🍦 Explore Menu');
    jsCode = jsCode.replace(/\?\?\? Ask Me Anything/g, '💬 Ask Me Anything');
    jsCode = jsCode.replace(/\?\?\? Add more/g, '🛍️ Add more');
    jsCode = jsCode.replace(/\?\?\? Place Order/g, '✅ Place Order');
    jsCode = jsCode.replace(/\?\?\? Takeaway/g, '🥡 Takeaway');
    jsCode = jsCode.replace(/\?\?\? Delivery/g, '🛵 Delivery');
    jsCode = jsCode.replace(/\?\?\? Confirm Order/g, '🚀 Confirm Order');
    
    // Also, WhatsApp max button text is 20 characters.
    // '🛍️ Order on WhatsApp' is exactly 20 chars, but WhatsApp counts emojis as 2 chars sometimes!
    // Let's remove emojis from button titles just to be 100% safe against the 20-char limit!
    jsCode = jsCode.replace(/🛍️ Order on WhatsApp/g, 'Order on WhatsApp'); // 17 chars
    jsCode = jsCode.replace(/🍦 Explore Menu/g, 'Explore Menu'); // 12 chars
    jsCode = jsCode.replace(/💬 Ask Me Anything/g, 'Ask Me Anything'); // 15 chars
    jsCode = jsCode.replace(/🛍️ Add more/g, 'Add More'); // 8 chars
    jsCode = jsCode.replace(/✅ Place Order/g, 'Place Order'); // 11 chars
    jsCode = jsCode.replace(/🥡 Takeaway/g, 'Takeaway'); // 8 chars
    jsCode = jsCode.replace(/🛵 Delivery/g, 'Delivery'); // 8 chars
    jsCode = jsCode.replace(/🚀 Confirm Order/g, 'Confirm Order'); // 13 chars
    
    buildNode.parameters.jsCode = jsCode;
  }

  const payload = {
    name: data.name,
    nodes: data.nodes,
    connections: data.connections,
    settings: data.settings || {},
    staticData: data.staticData || null
  };

  const updateRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
  const updateData = await updateRes.json();
  console.log('Update success:', updateData.id);
}

patch().catch(console.error);
