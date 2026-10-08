const fs = require('fs');

async function deploy() {
  const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
    'Content-Type': 'application/json'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();
  
  // 1. ROUTE INBOUND MESSAGE
  const routeNode = data.nodes.find(n => n.name === 'Route Inbound Message');
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
if (isGreeting) isNew = true;

const menuKeywords = ['menu', 'show menu', 'show me the menu', 'send menu', 'send me the menu', 'what do you have', "what's on the menu", 'explore menu', 'order now'];
const isMenuIntent = menuKeywords.some(kw => textLower === kw || textLower.includes(kw)) || textLower === 'btn_menu';

if (context.session && context.session.ai_enabled === false) { route = 'staff'; }
else if (context.is_open === false) {
  route = 'response';
  const message = 'Pabbas is currently closed. Please try again during our opening hours.';
  response = { customer_phone: input.phone, log_text: message, outgoing: { type: 'text', text: { body: message } } };
}
else if (match) { route = match[1].toLowerCase(); }
else if (isNew) { route = 'response'; action = 'welcome'; }
else if (isMenuIntent) { route = 'response'; action = 'menu_cta'; }
else if (textLower === 'btn_order' || textLower === '🛍️ order on whatsapp' || textLower === 'order on whatsapp') { route = 'response'; action = 'start_whatsapp_order'; }
else if (textLower === 'btn_ask' || textLower === '💬 ask me anything' || textLower === 'ask me anything') { route = 'response'; action = 'start_questions'; }
else { route = 'ai'; }

return [{
  json: { route, action, order_number: match ? match[2].toUpperCase() : null, customer_phone: input.phone, customer_name: input.customer_name, channel_user_id: input.channel_user_id || null, response }
}];`;

  // 2. VALIDATE MENU AND PRICE
  const valNode = data.nodes.find(n => n.name === 'Validate Menu And Price');
  valNode.parameters.jsCode = `const source = $('Build AI Order Request').first().json;
const context = source.context || {};
const inboundText = String($('Extract Inbound Message').first().json.content || '').trim();
const inboundTextLower = inboundText.toLowerCase();
const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, channel_user_id: source.channel_user_id, action: 'reply', reply: '', order_type: 'takeaway', items: [], total: 0, order_number: null, original_items: [] };

// 1. HARD INTERCEPTS (Check exact ID OR title)
if (inboundText === 'btn_checkout' || inboundTextLower === 'place order' || inboundTextLower === '? place order') {
  out.action = 'reply';
  out.reply = "Will this be for Takeaway or Delivery?";
  out.render_buttons = 'mode';
  return [{json: out}];
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
  out.action = 'reply';
  out.reply = "Please type your full delivery address below:";
  return [{json: out}];
}

const lastAssistantMessage = context.history?.slice().reverse().find(m => m.role === 'assistant');
const askedForAddress = lastAssistantMessage && lastAssistantMessage.content.includes("Please type your full delivery address");

if (askedForAddress && !inboundText.startsWith('btn_') && inboundTextLower !== 'confirm order') {
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

if (inboundText === 'btn_confirm_takeaway' || inboundTextLower === 'confirm order (takeaway)') {
  out.action = 'checkout';
  out.order_type = 'takeaway';
  out.items = context.pending_cart?.items || [];
  return [{json: out}];
}

if (inboundText.startsWith('btn_confirm_delivery:') || inboundTextLower.startsWith('confirm order')) {
  // If user just typed "confirm order", we extract address from context or default to previous msg
  out.action = 'checkout';
  out.order_type = 'delivery';
  out.delivery_address = inboundText.startsWith('btn_confirm_delivery:') ? inboundText.substring('btn_confirm_delivery:'.length) : 'Saved Address';
  out.items = context.pending_cart?.items || [];
  return [{json: out}];
}

if (inboundText === 'btn_add_more' || inboundTextLower === 'add more') {
  out.action = 'reply'; out.reply = "Sure! What else would you like to add?"; return [{json: out}];
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

  // 3. BUILD OUTBOUND MESSAGE
  const buildNode = data.nodes.find(n => n.name === 'Build Outbound Message');
  buildNode.parameters.jsCode = `const input = $input.first()?.json || {};
const inbound = $('Extract Inbound Message').first()?.json || {};
const route = $('Route Inbound Message').first()?.json || {};

const phone = String(input.customer_phone || input.phone || inbound.phone || route.customer_phone || '').trim();
const customerName = String(input.customer_name || input.name || inbound.customer_name || route.customer_name || '').trim();
const channelUserId = String(input.channel_user_id || inbound.channel_user_id || '').trim();
const ctaUrl = String(input.cta_url || '').trim();

const action = String(input.action || route.action || 'reply').toLowerCase();
const orderNumber = String(input.order_number || route.order_number || '').trim();
const result = String(input.result || '').trim();
const renderButtons = String(input.render_buttons || '').trim();
const deliveryAddress = String(input.delivery_address || '').trim();

let reply = String(input.reply || input.log_text || '').trim();
if (!reply && route.response) reply = String(route.response.log_text || route.response.reply || '').trim();
if (action === 'checkout') return [];
if (!phone) throw new Error('Missing phone.');

let text = reply || 'Pabbas could not process that request.';
let interactive = null;
const nameGreeting = customerName ? \`Hey \${customerName.split(/\\s+/)[0]}!\` : \`Hey there!\`;

if (action === 'create' || action === 'amend') {
  const items = Array.isArray(input.items_json) && input.items_json.length ? input.items_json : Array.isArray(input.items) ? input.items : [];
  const lines = items.map((item) => \`\${String(item?.name || 'Item').trim()} x\${Number(item?.quantity || 1)}\`).join('\\n');
  text = \`\${action === 'create' ? 'Order draft' : 'Order updated'}\${orderNumber ? \` \${orderNumber}\` : ''}:\\n\${lines}\\nTotal: Rs \${Number(input.total || 0).toFixed(2)}\\n\\nPlease confirm your order.\`;
  if (orderNumber) interactive = { type: 'button', body: { text }, action: { buttons: [{ type: 'reply', reply: { id: \`btn_confirm:\${orderNumber}\`, title: 'Confirm order' } }, { type: 'reply', reply: { id: \`btn_cancel:\${orderNumber}\`, title: 'Cancel order' } }] } };
}
else if (action === 'confirm') text = \`Order \${orderNumber} confirmation result: \${result}.\`;
else if (action === 'cancel') text = \`Order \${orderNumber} cancellation result: \${result}.\`;
else if (action === 'greet') text = \`\${nameGreeting} 👋 Welcome to Pabbas! 🍨\\n\\nHow can I help you today?\`;
else if (action === 'welcome') {
  text = \`\${nameGreeting} 👋 Welcome to Pabbas! 🍨\\n\\nI can help you order directly on WhatsApp, explore our menu, or answer any questions.\\n\\nChoose an option below 👇\`;
  if (ctaUrl) interactive = { type: 'button', body: { text }, action: { buttons: [{ type: 'reply', reply: { id: \`btn_order\`, title: 'Order on WhatsApp' } }, { type: 'reply', reply: { id: \`btn_menu\`, title: 'Explore Menu' } }, { type: 'reply', reply: { id: \`btn_ask\`, title: 'Ask Me Anything' } }] } };
}
else if (action === 'menu_cta') text = reply || \`Sure! 🍦 You can explore the full menu and place an order securely here.\`;
else if (action === 'start_whatsapp_order') text = \`Absolutely! 😋 What would you like to order?\`;
else if (action === 'start_questions') text = \`Of course! 😊 What would you like to know?\`;
else if (action === 'add' || action === 'remove') {
  text = \`\${reply}\`;
  interactive = { type: 'button', body: { text }, action: { buttons: [{ type: 'reply', reply: { id: \`btn_add_more\`, title: 'Add More' } }, { type: 'reply', reply: { id: \`btn_checkout\`, title: 'Place Order' } }] } };
}
else if (action === 'reply') {
  text = \`\${reply}\`;
  if (renderButtons === 'mode') {
    interactive = { type: 'button', body: { text }, action: { buttons: [{ type: 'reply', reply: { id: \`btn_takeaway\`, title: 'Takeaway' } }, { type: 'reply', reply: { id: \`btn_delivery\`, title: 'Delivery' } }] } };
  } else if (renderButtons === 'confirm_takeaway') {
    interactive = { type: 'button', body: { text }, action: { buttons: [{ type: 'reply', reply: { id: \`btn_confirm_takeaway\`, title: 'Confirm Order' } }] } };
  } else if (renderButtons === 'confirm_delivery') {
    interactive = { type: 'button', body: { text }, action: { buttons: [{ type: 'reply', reply: { id: \`btn_confirm_delivery:\${deliveryAddress}\`, title: 'Confirm Order' } }] } };
  }
}

if (!interactive && ctaUrl && ['reply', 'add', 'remove', 'start_whatsapp_order', 'start_questions', 'menu_cta'].includes(action)) {
  interactive = { type: 'cta_url', body: { text }, action: { name: 'cta_url', parameters: { display_text: 'Explore Menu', url: ctaUrl } } };
}

const outgoing = interactive ? { type: 'interactive', interactive } : { type: 'text', text: { body: text } };
return [{ json: { customer_phone: phone, customer_name: customerName, channel_user_id: channelUserId, order_number: orderNumber || null, action, log_text: text, outgoing, ycloud_payload: { from: '+919180348124', to: phone, ...outgoing } } }];`;

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
  fs.writeFileSync('scratch/ai_workflow.json', JSON.stringify(data, null, 2));
}

deploy().catch(console.error);
