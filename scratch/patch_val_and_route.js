const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const validateNode = data.nodes.find(n => n.name === 'Validate Menu And Price');

if (validateNode) {
  validateNode.parameters.jsCode = `const source = $('Build AI Order Request').first().json;
const context = source.context || {};
const inboundText = String($('Extract Inbound Message').first().json.content || '').trim();
const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, channel_user_id: source.channel_user_id, action: 'reply', reply: '', order_type: 'takeaway', items: [], total: 0, order_number: null, original_items: [] };

// ==========================================
// 1. HARD INTERCEPTS FOR INTERACTIVE BUTTONS
// ==========================================

if (inboundText === 'btn_checkout') {
  out.action = 'reply';
  out.reply = "Will this be for Takeaway or Delivery?";
  out.render_buttons = 'mode';
  return [{json: out}];
}

if (inboundText === 'btn_takeaway') {
  const cart = context.pending_cart?.items || [];
  if (!cart.length) { out.action = 'reply'; out.reply = 'Your cart is empty!'; return [{json: out}]; }
  const lines = cart.map(item => \`• \${item.name} x\${item.quantity}\`).join('\\n');
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  out.action = 'reply';
  out.reply = \`*Order Summary (Takeaway)*\\n\\n\${lines}\\n\\n*Total:* ?\${total}\\n\\nName: \${source.customer_name}\\nPhone: \${source.customer_phone}\\n\\nPlease confirm your order.\`;
  out.render_buttons = 'confirm_takeaway';
  return [{json: out}];
}

if (inboundText === 'btn_delivery') {
  out.action = 'reply';
  out.reply = "Please type your full delivery address below:";
  return [{json: out}];
}

const lastAssistantMessage = context.history?.slice().reverse().find(m => m.role === 'assistant');
const askedForAddress = lastAssistantMessage && lastAssistantMessage.content.includes("Please type your full delivery address below");

if (askedForAddress && !inboundText.startsWith('btn_')) {
  const cart = context.pending_cart?.items || [];
  if (!cart.length) { out.action = 'reply'; out.reply = 'Your cart is empty!'; return [{json: out}]; }
  const lines = cart.map(item => \`• \${item.name} x\${item.quantity}\`).join('\\n');
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const address = inboundText.substring(0, 200);
  out.action = 'reply';
  out.reply = \`*Order Summary (Delivery)*\\n\\n\${lines}\\n\\n*Total:* ?\${total}\\n\\nName: \${source.customer_name}\\nPhone: \${source.customer_phone}\\nAddress: \${address}\\n\\nPlease confirm your order.\`;
  out.render_buttons = 'confirm_delivery';
  out.delivery_address = address;
  return [{json: out}];
}

if (inboundText === 'btn_confirm_takeaway') {
  out.action = 'checkout';
  out.order_type = 'takeaway';
  out.items = context.pending_cart?.items || [];
  return [{json: out}];
}

if (inboundText.startsWith('btn_confirm_delivery:')) {
  out.action = 'checkout';
  out.order_type = 'delivery';
  out.delivery_address = inboundText.substring('btn_confirm_delivery:'.length);
  out.items = context.pending_cart?.items || [];
  return [{json: out}];
}

if (inboundText === 'btn_add_more') {
  out.action = 'reply';
  out.reply = "Sure! What else would you like to add?";
  return [{json: out}];
}


// ==========================================
// 2. STANDARD AI PARSING
// ==========================================
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
  
  // If AI hallucinates checkout, just force them into the interactive flow!
  out.action = 'reply';
  out.reply = "Will this be for Takeaway or Delivery?";
  out.render_buttons = 'mode';
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

// Ensure Route Inbound Message allows all buttons to go to AI
const routeNode = data.nodes.find(n => n.name === 'Route Inbound Message');
if (routeNode) {
  routeNode.parameters.jsCode = `const input = $('Extract Inbound Message').first().json;
const context = $('Retrieve Chat Context').first().json || {};

const text = String(input.content || '').trim();
const textLower = text.toLowerCase();
const match = text.match(/^btn_(confirm|cancel):([A-Z0-9-]+)$/i);

let route = 'ai';
let response = null;
let action = 'reply';

let isNew = !context.history || context.history.length <= 1;

const isGreeting = /^(hi+|hello+|hey+|hii+|hiii+|start|greeting|greetings|namaste)$/i.test(textLower);
if (isGreeting) {
  isNew = true;
}

const menuKeywords = ['menu', 'show menu', 'show me the menu', 'send menu', 'send me the menu', 'what do you have', "what's on the menu", 'explore menu', 'order now'];
const isMenuIntent = menuKeywords.some(kw => textLower === kw || textLower.includes(kw)) || textLower === 'btn_menu';

if (context.session && context.session.ai_enabled === false) {
  route = 'staff';
}
else if (context.is_open === false) {
  route = 'response';
  const message = 'Pabbas is currently closed. Please try again during our opening hours.';
  response = { customer_phone: input.phone, log_text: message, outgoing: { type: 'text', text: { body: message } } };
}
else if (match) {
  route = match[1].toLowerCase();
}
else if (isNew) {
  route = 'response'; action = 'welcome';
}
else if (isMenuIntent) {
  route = 'response'; action = 'menu_cta';
}
else if (textLower === 'btn_order' || textLower === '??? order on whatsapp' || textLower === 'order on whatsapp') {
  route = 'response'; action = 'start_whatsapp_order';
}
else if (textLower === 'btn_ask' || textLower === '?? ask me anything' || textLower === 'ask me anything') {
  route = 'response'; action = 'start_questions';
}
else {
  // All other buttons and text go to AI for intercepting!
  route = 'ai';
}

return [{
  json: {
    route,
    action,
    order_number: match ? match[2].toUpperCase() : null,
    customer_phone: input.phone,
    customer_name: input.customer_name,
    channel_user_id: input.channel_user_id || null,
    response
  }
}];`;
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
