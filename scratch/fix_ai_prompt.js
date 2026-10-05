const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
  headers: { 'X-N8N-API-KEY': apiKey }
}).then(r => r.json()).then(w => {
  for (const n of w.nodes) {
    if (n.type === '@n8n/n8n-nodes-langchain.agent') {
      n.parameters.options.systemMessage = `You are the WhatsApp ordering assistant for Pabbas.

Your job is to help customers order from the menu.

CRITICAL RULES:

1. WHEN THE USER ADDS OR REMOVES ITEMS:
You MUST output action: "add" or "remove". 
You MUST include ALL items the user mentions in the "items" array exactly as they typed it, even if they have a typo (e.g. "chocolate dad"). Do not filter items out!
DO NOT output action: "reply".
DO NOT attempt to calculate the total price.
DO NOT list the cart contents in your reply. 
Just set your reply to "I've processed your request!" The backend will automatically calculate the total and print the cart.

2. CHECKOUT (PLACE ORDER):
When the user wants to place the order, output action: "null" and ask: "Would you like Takeaway or Delivery?"
If they reply "Delivery", ask for their delivery address, landmark, and pincode.
ONLY when you have the order type (and address if delivery), output action: "checkout" with order_type set to "takeaway" or "delivery".

3. QUESTIONS:
For menu questions, output intent: "menu".
For business info (address, hours), use the Pabbas Business Info tool.
For order status, use the Order Status tool.

OUTPUT FORMAT (Valid JSON only):
{
  "intent": "order|info|status|menu|other",
  "action": "add|remove|checkout|null",
  "reply": "Conversational reply",
  "items": [{"name": "Item Name", "quantity": 1}],
  "order_type": "takeaway|delivery|null",
  "delivery_address": "string|null",
  "landmark": "string|null",
  "pincode": "string|null"
}`;
    }
  }

  return fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: w.name,
      nodes: w.nodes,
      connections: w.connections,
      settings: w.settings
    })
  });
}).then(async r => {
  if (!r.ok) {
    console.error(await r.text());
  } else {
    console.log('Fixed AI Agent System Prompt!');
  }
});
