const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
  headers: { 'X-N8N-API-KEY': apiKey }
}).then(r => r.json()).then(w => {
  for (const n of w.nodes) {
    if (n.name === 'Route Inbound Message') {
      n.parameters.jsCode = `const input = $('Extract Inbound Message').first().json;
const context = $('Retrieve Chat Context').first().json || {};

const text = String(input.content || '').trim();
const textLower = text.toLowerCase();
const match = text.match(/^btn_(confirm|cancel):([A-Z0-9-]+)$/i);

let route = 'ai';
let response = null;
let action = 'reply';

// Check if new conversation or explicitly asked for greeting
let isNew = !context.history || context.history.length <= 1;

const greetings = ['hi', 'hello', 'hey', 'start', 'greeting', 'greetings', 'namaste'];
if (greetings.includes(textLower)) {
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
else if (textLower === 'btn_order' || textLower === '🛍️ order on whatsapp' || textLower === 'order on whatsapp') {
  route = 'response';
  action = 'start_whatsapp_order';
}
else if (textLower === 'btn_ask' || textLower === '💬 ask me anything' || textLower === 'ask me anything') {
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
}];`;
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
    console.log('Fixed Route Inbound Message to always respond to greetings!');
  }
});