const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));

const orderNode = data.nodes.find(n => n.name === 'Place Final Order' && n.type === 'n8n-nodes-base.httpRequest');
if (orderNode) {
  orderNode.parameters.jsonBody = "={{ JSON.stringify({\n  customer_id: $('Lookup Trusted Customer Identity').first().json.customer_id,\n  customer_phone: $('Extract Inbound Message').first().json.phone,\n  customer_name: $('Extract Inbound Message').first().json.customer_name || 'Customer',\n  cart_items: $json.items.map(i=>({name:i.item_name || i.name, quantity:i.quantity, menu_item_id:i.menu_item_id})),\n  order_type: $json.order_type || 'pickup',\n  delivery_address: $json.delivery_address || null,\n  source: 'whatsapp'\n}) }}";
  
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const payload = {
    name: data.name,
    nodes: data.nodes,
    connections: data.connections,
    settings: data.settings || {},
    staticData: data.staticData || null
  };
  
  fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(r => console.log('Update success:', r.id))
    .catch(console.error);
}
