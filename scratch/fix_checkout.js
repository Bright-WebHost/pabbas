const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('debug_bridge.json', 'utf-8'));

for (const n of w.nodes) {
  // Update AI Prompt
  if (n.type === '@n8n/n8n-nodes-langchain.agent') {
    n.parameters.options.systemMessage = `You are the WhatsApp ordering assistant for Pabbas.

Your job is to help customers, answer questions, manage orders, and guide them to the secure Pabbas ordering website when useful.

IMPORTANT ARCHITECTURE:
- The AI is NOT the database. Use your tools!
- NEVER invent prices, menu items, business information, or order status.
- NEVER modify another customer's order.
- NEVER bypass backend validation.
- NEVER dump the entire menu into plain text.
- NEVER act like a generic chatbot. Pabbas is a premium brand.

RULES:

1. EXISTING CONVERSATIONS & GREETINGS
If the user just says "Hi" or "Hello" in an ongoing conversation, give a very short, casual, and friendly response (e.g., "Hey Maithri! Need help with anything else?"). 
DO NOT output a full generic welcome like "Welcome back to Pabbas. How can I assist you today?". Be conversational and brief.

2. BUSINESS QUESTIONS
Use the Pabbas Business Info tool.
Examples: What's your address? Where are you located? What time do you open? How long does delivery take?

3. MENU QUESTIONS
If they ask for the menu, output intent "menu" so the system can attach the secure CTA link. Do not list the whole menu in plain text.
Examples: Show me the menu. What do you have? Send me the menu.

4. ORDERING
When a customer wants to order items or add to cart, do NOT call tools.
Instead, output action: "add" or "remove" with the items.
The system will automatically validate items against the menu and look up prices.
Examples: "2 golden gadbad" = items: [{name: "Golden Gadbad", quantity: 2}]
"Add one chocolate and 3 lime juice" = items: [{name: "Dubai Chocolate", quantity: 1}, {name: "Fresh Lime Soda", quantity: 3}]

5. CHECKOUT
For checking out ("place order"), DO NOT immediately output action: "checkout".
First, if you do not know the order type, output action: "null" and ask the customer if they want 'Takeaway' or 'Delivery'. 
If they want 'Delivery', ask for their full delivery address, landmark, and pincode.
Only output action: "checkout" once you have the order type (and the address if delivery).
Set order_type to "takeaway" or "delivery".

6. ORDER STATUS & MODIFICATION
Use the Pabbas Order Status tool to check status.
Use the Pabbas Order Update tool ONLY after checking the order status.
If the backend returns ORDER_LOCKED, do not retry or bypass it. Politely tell the customer the order has already started preparation and cannot be changed.

OUTPUT FORMAT
Return ONLY valid JSON:
{
  "intent": "order|info|status|menu|other",
  "action": "add|remove|checkout|null",
  "reply": "short natural WhatsApp response",
  "items": [],
  "order_type": "takeaway|delivery|null",
  "delivery_address": "string|null",
  "landmark": "string|null",
  "pincode": "string|null"
}
        
7. PENDING CART
The customer's current cart is in \`context.pending_cart\`.
If they add items, output: {"intent": "order", "action": "add", "items": [{"name": "...", "quantity": 1}]}
If they remove items, output: {"intent": "order", "action": "remove", "items": [{"name": "...", "quantity": 1}]}
If they ask what's in their cart, look at context.pending_cart and output a normal reply.
DO NOT call the Pabbas Cart tool.`;
  }
  
  // Update Validate Menu And Price to pass through address info
  if (n.name === 'Validate Menu And Price') {
    n.parameters.jsCode = `const source = $('Build AI Order Request').first().json;
const context = source.context || {};
const raw = String($input.first().json.output || '').replace(/\\r/g, '').replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
const norm = (v) => String(v || '').toLowerCase().replace(/\\s+/g, ' ').trim();
const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, channel_user_id: source.channel_user_id, action: 'reply', reply: 'Tell me what you would like to order.', order_type: 'takeaway', items: [], total: 0, order_number: null, original_items: [] };
let parsed = null;
try { const a = raw.indexOf('{'); const b = raw.lastIndexOf('}'); if (a >= 0 && b > a) parsed = JSON.parse(raw.slice(a, b + 1)); } catch {}

if (!parsed || parsed.intent !== 'order') { 
  out.action = parsed?.intent === 'menu' ? 'menu_cta' : 'reply'; 
  out.reply = String(parsed?.reply || "I didn't quite catch that. Could you please clarify what you'd like to order or ask?"); 
  return [{ json: out }]; 
}

if (parsed.action === 'checkout') {
  const cart = context.pending_cart?.items || [];
  if (!cart.length) { out.reply = 'Your cart is empty!'; out.action = 'reply'; return [{json: out}]; }
  out.action = 'checkout';
  out.items = cart;
  out.order_type = parsed.order_type || 'takeaway';
  out.delivery_address = parsed.delivery_address || null;
  out.landmark = parsed.landmark || null;
  out.pincode = parsed.pincode || null;
  return [{json: out}];
}

if (parsed.action === 'add' || parsed.action === 'remove') {
  const menu = new Map();
  for (const line of (typeof context.menu === 'string' ? context.menu.split('\\n') : [])) { const i = line.lastIndexOf('|'); if (i > 0) menu.set(norm(line.slice(0, i)), { name: line.slice(0, i).trim(), price: Number(line.slice(i + 1)) || 0 }); }
  for (const candidate of (Array.isArray(parsed.items) ? parsed.items : [])) { 
    const item = menu.get(norm(candidate?.name)); 
    const quantity = Math.round(Number(candidate?.quantity)); 
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) { 
      out.reply = !item ? \`I'm sorry, I couldn't find "\${candidate?.name}" on our current menu. Could you please check the menu or clarify?\` : 'Please choose a quantity between 1 and 50.'; 
      out.action = 'reply';
      return [{ json: out }]; 
    } 
    out.items.push({ name: item.name, quantity, price: item.price }); 
  }

  if (!out.items.length) { 
    out.reply = String(parsed.reply || "I didn't catch any items. What would you like to order?"); 
    out.action = 'reply';
    return [{ json: out }]; 
  }

  out.action = parsed.action;
  out.original_items = out.items;
  return out.items.map(i => ({ json: { ...out, item: i, ai_reply: parsed.reply } }));
}

out.action = 'reply';
out.reply = String(parsed.reply || "I didn't understand. Can you rephrase?");
return [{ json: out }];
`;
  }

  // Update Cart replies to be dynamic
  if (n.name === 'Build Add Reply') {
    n.parameters.jsCode = `const first = $input.first().json; 
const cart = first.cart || {};
const items = cart.items || [];
let lines = items.map(i => \`- \${i.item_name || i.name} x\${i.quantity}\`).join('\\n');
if (!lines) lines = 'Your cart is empty.';
const reply = (first.ai_reply || "I've updated your cart!") + \`\\n\\n*Current Order:*\\n\${lines}\\n*Total:* ₹\${cart.total || 0}\\n\\nWould you like to add anything else or place the order?\`;
return [{json:{...first, reply}}];`;
  }
  if (n.name === 'Build Rem Reply') {
    n.parameters.jsCode = `const first = $input.first().json; 
const cart = first.cart || {};
const items = cart.items || [];
let lines = items.map(i => \`- \${i.item_name || i.name} x\${i.quantity}\`).join('\\n');
if (!lines) lines = 'Your cart is empty.';
const reply = (first.ai_reply || "I've updated your cart!") + \`\\n\\n*Current Order:*\\n\${lines}\\n*Total:* ₹\${cart.total || 0}\\n\\nWould you like to add anything else or place the order?\`;
return [{json:{...first, reply}}];`;
  }

  // Update Place Final Order
  if (n.name === 'Place Final Order') {
    n.parameters.jsonBody = `={{ JSON.stringify({
  customer_id: $('Lookup Trusted Customer Identity').first().json.customer_id,
  customer_phone: $('Extract Inbound Message').first().json.phone,
  customer_name: $('Extract Inbound Message').first().json.customer_name || 'Customer',
  cart_items: $json.items.map(i=>({name:i.item_name || i.name, quantity:i.quantity, menu_item_id:i.menu_item_id})),
  order_type: $json.order_type === 'pickup' ? 'takeaway' : ($json.order_type || 'takeaway'),
  delivery_address: $json.delivery_address,
  landmark: $json.landmark,
  pincode: $json.pincode,
  source: 'whatsapp'
}) }}`;
  }
}

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
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
}).then(async r => {
  if (!r.ok) {
    console.error(await r.text());
  } else {
    console.log('Fixed n8n Checkout Flow');
  }
});
