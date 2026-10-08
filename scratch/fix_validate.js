const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('debug_bridge.json', 'utf-8'));

for (const n of w.nodes) {
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
  
  if (n.name === 'Build Add Reply' || n.name === 'Build Rem Reply') {
     n.parameters.jsCode = `const first = $input.first().json; 
const validateData = $('Validate Menu And Price').first().json || {};
const items = first.items || [];

if (first.error) {
  return [{
    json: {
      ...first,
      customer_phone: validateData.customer_phone,
      customer_name: validateData.customer_name,
      channel_user_id: validateData.channel_user_id,
      action: validateData.action,
      reply: "I'm sorry, " + first.error + ". Could you please check the menu or clarify?"
    }
  }];
}

let lines = items.map(i => \`- \${i.item_name || i.name} x\${i.quantity}\`).join('\\n');
if (!lines) lines = 'Your cart is empty.';
const reply = (first.ai_reply || "I've updated your cart!") + \`\\n\\n*Current Order:*\\n\${lines}\\n*Total:* ₹\${first.total || 0}\\n\\nWould you like to add anything else or place the order?\`;

return [{
  json: {
    ...first,
    customer_phone: validateData.customer_phone,
    customer_name: validateData.customer_name,
    channel_user_id: validateData.channel_user_id,
    action: validateData.action,
    reply
  }
}];`;
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
    console.log('Fixed Validate Menu And Price to stop filtering items!');
  }
});
