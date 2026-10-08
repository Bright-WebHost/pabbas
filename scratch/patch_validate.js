const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const validateNode = data.nodes.find(n => n.name === 'Validate Menu And Price');

if (validateNode) {
  validateNode.parameters.jsCode = `const source = $('Build AI Order Request').first().json;
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
  
  if (!parsed.order_type) {
    out.reply = "Please let me know if this order is for Takeaway or Delivery before we place it.";
    out.action = 'reply';
    return [{json: out}];
  }

  if (parsed.order_type.toLowerCase() === 'delivery' && !parsed.delivery_address) {
    out.reply = "Please provide your full delivery address so we can place the order.";
    out.action = 'reply';
    return [{json: out}];
  }

  out.action = 'checkout';
  out.items = cart;
  out.order_type = parsed.order_type.toLowerCase();
  out.delivery_address = parsed.delivery_address || null;
  out.landmark = parsed.landmark || null;
  out.pincode = parsed.pincode || null;
  return [{json: out}];
}

if (parsed.action === 'add' || parsed.action === 'remove') {
  for (const candidate of (Array.isArray(parsed.items) ? parsed.items : [])) { 
    const quantity = Math.round(Number(candidate?.quantity)); 
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) { 
      out.reply = 'Please choose a quantity between 1 and 50.'; 
      out.action = 'reply';
      return [{ json: out }]; 
    } 
    // We pass whatever name the AI gave us directly to the backend API for fuzzy matching!
    out.items.push({ name: candidate.name, quantity }); 
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
