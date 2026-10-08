const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));

// 1. Fix Route Inbound Message
const routeNode = data.nodes.find(n => n.name === 'Route Inbound Message');
if (routeNode) {
  routeNode.parameters.jsCode = `
const input = $('Extract Inbound Message').first().json;
const context = $('Retrieve Chat Context').first().json || {};

const text = String(input.content || '').trim();
const textLower = text.toLowerCase();
const match = text.match(/^btn_(confirm|cancel):([A-Z0-9-]+)$/i);

let route = 'ai';
let response = null;
let action = 'reply';

// Check if new conversation or explicitly asked for greeting
let isNew = !context.history || context.history.length <= 1;

// Better greeting detection
const isGreeting = /^(hi+|hello+|hey+|hii+|hiii+|start|greeting|greetings|namaste)$/i.test(textLower);
if (isGreeting) {
  isNew = true;
}

// Menu Intent detection (robust)
const menuKeywords = ['menu', 'show menu', 'show me the menu', 'send menu', 'send me the menu', 'what do you have', "what's on the menu", 'explore menu', 'order now'];
const isMenuIntent = menuKeywords.some(kw => textLower === kw || textLower.includes(kw)) || textLower === 'btn_menu';

// 1. Staff takeover
if (context.session && context.session.ai_enabled === false) {
  route = 'staff';
}
// 2. Restaurant closed
else if (context.is_open === false) {
  route = 'response';
  const message = 'Pabbas is currently closed. Please try again during our opening hours.';
  response = {
    customer_phone: input.phone,
    log_text: message,
    outgoing: { type: 'text', text: { body: message } }
  };
}
// 3. Order confirmation/cancellation buttons
else if (match) {
  route = match[1].toLowerCase();
}
// 4. NEW CONVERSATION OR GREETING
else if (isNew) {
  route = 'response'; // Bypass AI
  action = 'welcome';
}
// 5. EXPLICIT MENU REQUEST IN EXISTING CONVO
else if (isMenuIntent) {
  route = 'response'; // Bypass AI
  action = 'menu_cta';
}
// 6. BUTTON CLICKS (Order on WhatsApp, Ask Me Anything)
else if (textLower === 'btn_order' || textLower === '??? order on whatsapp' || textLower === 'order on whatsapp') {
  route = 'response';
  action = 'start_whatsapp_order';
}
else if (textLower === 'btn_ask' || textLower === '?? ask me anything' || textLower === 'ask me anything') {
  route = 'response';
  action = 'start_questions';
}
// 7. EVERYTHING ELSE GOES TO AI
else {
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
}];
`;
}

// 2. Fix Build Outbound Message to suppress checkout double message
const buildNode = data.nodes.find(n => n.name === 'Build Outbound Message');
if (buildNode) {
  let jsCode = buildNode.parameters.jsCode;
  // If action is checkout, we don't want to return anything, because pabbas-order-created webhook handles it!
  jsCode = jsCode.replace(/else if \(action === 'reply' \|\| action === 'add' \|\| action === 'remove' \|\| action === 'checkout'\)/g, 
    "else if (action === 'reply' || action === 'add' || action === 'remove')");
  
  // Also suppress checkout completely
  jsCode = jsCode.replace(/if \(\!phone\) {/g, 
    "if (action === 'checkout') {\n  return []; // Suppress AI reply because pabbas-order-created webhook will send the confirmation!\n}\n\nif (!phone) {");
  
  buildNode.parameters.jsCode = jsCode;
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

