const fs = require('fs');

async function patchValidateAddress() {
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  
  const valNode = data.nodes.find(n => n.name === 'Validate Menu And Price');
  if (valNode) {
    valNode.parameters.jsCode = `const source = $('Build AI Order Request').first().json;
const context = source.context || {};
const inboundText = String($('Extract Inbound Message').first().json.content || '').trim();
const inboundTextLower = inboundText.toLowerCase();
const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, channel_user_id: source.channel_user_id, action: 'reply', reply: '', order_type: 'takeaway', items: [], total: 0, order_number: null, original_items: [] };

// 1. HARD INTERCEPTS
if (inboundText === 'btn_checkout' || inboundTextLower === 'place order' || inboundTextLower === '? place order') {
  out.action = 'reply'; out.reply = "Will this be for Takeaway or Delivery?"; out.render_buttons = 'mode'; return [{json: out}];
}

if (inboundText === 'btn_takeaway' || inboundTextLower === 'takeaway') {
  const cart = context.pending_cart?.items || [];
  if (!cart.length) { out.action = 'reply'; out.reply = 'Your cart is empty!'; return [{json: out}]; }
  const lines = cart.map(item => \`• \${item.name} x\${item.quantity}\`).join('\\n');
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  out.action = 'reply';
  out.reply = \`*Order Summary (Takeaway)*\\n\\n\${lines}\\n\\n*Total:* ₹\${total}\\n\\nName: \${source.customer_name}\\nPhone: \${source.customer_phone}\\n\\nPlease confirm your order.\`;
  out.render_buttons = 'confirm_takeaway';
  return [{json: out}];
}

if (inboundText === 'btn_delivery' || inboundTextLower === 'delivery') {
  out.action = 'reply'; out.reply = "Please type your full delivery address below:"; return [{json: out}];
}

if (inboundText === 'btn_confirm_takeaway' || inboundTextLower === 'confirm order (takeaway)') {
  out.action = 'checkout'; out.order_type = 'takeaway'; out.items = context.pending_cart?.items || []; return [{json: out}];
}

if (inboundText.startsWith('btn_confirm_delivery:') || inboundTextLower.startsWith('confirm order')) {
  out.action = 'checkout'; out.order_type = 'delivery'; out.delivery_address = inboundText.startsWith('btn_confirm_delivery:') ? inboundText.substring('btn_confirm_delivery:'.length) : 'Saved Address'; out.items = context.pending_cart?.items || []; return [{json: out}];
}

if (inboundText === 'btn_add_more' || inboundTextLower === 'add more') {
  out.action = 'reply'; out.reply = "Sure! What else would you like to add?"; return [{json: out}];
}

// Check if user is typing an address!
const userMessages = (context.history || []).filter(m => m.role === 'user' || m.role === 'customer');
const recentUserMessages = userMessages.slice(-3).map(m => String(m.content).toLowerCase());

const isAnsweringDelivery = recentUserMessages.includes('delivery') || recentUserMessages.includes('btn_delivery');

if (isAnsweringDelivery && !inboundText.startsWith('btn_') && inboundText.length > 5) {
  const cart = context.pending_cart?.items || [];
  if (!cart.length) { out.action = 'reply'; out.reply = 'Your cart is empty!'; return [{json: out}]; }
  const lines = cart.map(item => \`• \${item.name} x\${item.quantity}\`).join('\\n');
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const address = inboundText.substring(0, 200);
  out.action = 'reply';
  out.reply = \`*Order Summary (Delivery)*\\n\\n\${lines}\\n\\n*Total:* ₹\${total}\\n\\nName: \${source.customer_name}\\nPhone: \${source.customer_phone}\\nAddress: \${address}\\n\\nPlease confirm your order.\`;
  out.render_buttons = 'confirm_delivery';
  out.delivery_address = address;
  return [{json: out}];
}


// 2. STANDARD AI PARSING
const raw = String($input.first().json.output || '').replace(/\\r/g, '').replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
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
  
  if (parsed.delivery_address) {
    const lines = cart.map(item => \`• \${item.name} x\${item.quantity}\`).join('\\n');
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const address = String(parsed.delivery_address).substring(0, 200);
    out.action = 'reply';
    out.reply = \`*Order Summary (Delivery)*\\n\\n\${lines}\\n\\n*Total:* ₹\${total}\\n\\nName: \${source.customer_name}\\nPhone: \${source.customer_phone}\\nAddress: \${address}\\n\\nPlease confirm your order.\`;
    out.render_buttons = 'confirm_delivery';
    out.delivery_address = address;
    return [{json: out}];
  }

  out.action = 'reply'; out.reply = "Will this be for Takeaway or Delivery?"; out.render_buttons = 'mode'; return [{json: out}];
}

if (parsed.action === 'add' || parsed.action === 'remove') {
  for (const candidate of (Array.isArray(parsed.items) ? parsed.items : [])) { 
    const quantity = Math.round(Number(candidate?.quantity)); 
    if (quantity > 0) out.items.push({ name: candidate.name, quantity }); 
  }
  if (!out.items.length) { out.reply = "I didn't catch any items."; out.action = 'reply'; return [{ json: out }]; }
  out.action = parsed.action;
  out.original_items = out.items;
  return out.items.map(i => ({ json: { ...out, item: i, ai_reply: parsed.reply } }));
}

out.action = 'reply'; out.reply = String(parsed.reply || "I didn't understand. Can you rephrase?"); return [{ json: out }];
`;
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

patchValidateAddress().catch(console.error);
