const fs = require('fs');

async function patchFinalOrder() {
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  
  const finalNode = data.nodes.find(n => n.name === 'Place Final Order');
  if (finalNode) {
    finalNode.parameters.jsonBody = `={{ JSON.stringify({
  customer_id: $('Lookup Trusted Customer Identity').first().json.customer_id,
  customer_phone: $('Extract Inbound Message').first().json.phone,
  customer_name: $('Extract Inbound Message').first().json.customer_name || 'Customer',
  cart_items: $json.items.map(i=>({name:i.item_name || i.name, quantity:i.quantity, menu_item_id:i.menu_item_id})),
  order_type: $json.order_type || 'takeaway',
  delivery_address: $json.delivery_address || null,
  source: 'whatsapp'
}) }}`;
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

patchFinalOrder().catch(console.error);
