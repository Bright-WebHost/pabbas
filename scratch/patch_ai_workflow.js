const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));

const agentNode = data.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
if (agentNode) {
  let prompt = agentNode.parameters.options.systemMessage;
  prompt = prompt.replace(/4\. ORDERING.*?5\. ORDER STATUS/s, 
`4. ORDERING & CART
When a customer wants to order items or add to cart, output action: "add" or "remove" with the items.
Do not call tools.
The customer's current cart is in context.pending_cart.

CRITICAL CHECKOUT RULES:
Before you can checkout, you MUST gather the following details:
1. ORDER MODE: Ask if it's "Takeaway" or "Delivery". (Dine-in is not allowed via chat).
2. DELIVERY ADDRESS: If they chose "Delivery", you MUST ask for their delivery address.
3. CONFIRMATION: Once you have the mode (and address if delivery), summarize the entire order (items, mode, address) and ask the customer to confirm.

DO NOT output action: "checkout" until the customer explicitly says "yes", "okay", or confirms the summary.
If they just say "place order", you must reply asking for the mode (takeaway/delivery).
When they finally confirm, output: {"intent": "order", "action": "checkout", "order_type": "delivery", "delivery_address": "their address", "reply": "Your order has been placed..."}

5. ORDER STATUS`);
  
  agentNode.parameters.options.systemMessage = prompt;

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
