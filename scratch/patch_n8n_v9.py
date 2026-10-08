import json
import urllib.request

key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='):
            key = line.split('=', 1)[1].strip()

def get_workflow(workflow_id):
    url = f'https://staff.brightmedia.tech/api/v1/workflows/{workflow_id}'
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read().decode())

def update_workflow(workflow_id, data):
    url = f'https://staff.brightmedia.tech/api/v1/workflows/{workflow_id}'
    payload = {
        'name': data.get('name'),
        'nodes': data.get('nodes'),
        'connections': data.get('connections'),
        'settings': data.get('settings')
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), method='PUT', headers={
        'X-N8N-API-KEY': key, 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        print(e.read().decode('utf-8'))
        raise e

try:
    print('Updating Route Inbound Message and Build Outbound Message for Final Architecture...')
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    for node in wf['nodes']:
        if node['name'] == 'Route Inbound Message':
            new_code = """const input = $('Extract Inbound Message').first().json;
const context = $('Retrieve Chat Context').first().json || {};

const text = String(input.content || '').trim();
const textLower = text.toLowerCase();
const match = text.match(/^btn_(confirm|cancel):([A-Z0-9-]+)$/i);

let route = 'ai';
let response = null;
let action = 'reply';

// Check if new conversation
const isNew = !context.history || context.history.length === 0;

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
// 4. NEW CONVERSATION
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
}];
"""
            node['parameters']['jsCode'] = new_code
            print('  Updated Route Inbound Message.')

        if node['name'] == 'Build Outbound Message':
            original = node['parameters']['jsCode']
            
            final_block_index = original.find("// --------------------------------------------------\n// FINAL OUTGOING PAYLOAD")
            if final_block_index == -1:
                print("FATAL: Could not find FINAL OUTGOING PAYLOAD in Build Outbound Message.")
                exit(1)
                
            final_block = original[final_block_index:]
            
            new_build_code = """/*
 * PABBAS - BUILD OUTBOUND MESSAGE
 * Updated to properly handle deterministic Welcome and Menu CTAs.
 */

const input = $input.first()?.json || {};
const inbound = $('Extract Inbound Message').first()?.json || {};
const route = $('Route Inbound Message').first()?.json || {};

const phone = String(input.customer_phone || input.phone || inbound.phone || route.customer_phone || '').trim();
const customerName = String(input.customer_name || input.name || inbound.customer_name || route.customer_name || '').trim();
const channelUserId = String(input.channel_user_id || inbound.channel_user_id || '').trim();

const ctaUrl = String(input.cta_url || '').trim();

const action = String(input.action || route.action || 'reply').toLowerCase();
const orderNumber = String(input.order_number || route.order_number || '').trim();
const result = String(input.result || '').trim();

let reply = String(input.reply || input.log_text || '').trim();

if (!reply && route.response) {
  reply = String(route.response.log_text || route.response.reply || '').trim();
}

if (!phone) {
  throw new Error('Build Outbound Message: customer phone is missing.');
}

let text = reply || 'Pabbas could not process that request.';
let interactive = null;

const firstName = customerName ? customerName.split(/\\s+/)[0] : '';
const nameGreeting = firstName ? `Hey ${firstName}!` : `Hey there!`;

// ==================================================
// ACTION ROUTING
// ==================================================

if (action === 'create' || action === 'amend') {
  const items = Array.isArray(input.items_json) && input.items_json.length ? input.items_json : Array.isArray(input.items) ? input.items : [];
  const lines = items.map((item) => `${String(item?.name || 'Item').trim()} x${Number(item?.quantity || 1)}`).join('\\n');
  const total = Number(input.total || 0);

  text = `${action === 'create' ? 'Order draft' : 'Order updated'}${orderNumber ? ` ${orderNumber}` : ''}:\\n${lines || 'No items'}\\nTotal: Rs ${total.toFixed(2)}\\n\\nPlease confirm your order.`;

  if (orderNumber) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `btn_confirm:${orderNumber}`, title: 'Confirm order' } },
          { type: 'reply', reply: { id: `btn_cancel:${orderNumber}`, title: 'Cancel order' } }
        ]
      }
    };
  }
}
else if (action === 'confirm') {
  text = `Order ${orderNumber || ''} confirmation result: ${result || 'processed'}.`.trim();
}
else if (action === 'cancel') {
  text = `Order ${orderNumber || ''} cancellation result: ${result || 'processed'}.`.trim();
}
else if (action === 'welcome') {
  text = `${nameGreeting} 👋 Welcome to Pabbas! 🍨\\n\\nWhat are you craving today? 😋\\n\\nI can help you order directly on WhatsApp, explore our menu, or answer any questions.\\n\\nChoose an option below 👇`;
  
  if (ctaUrl) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `btn_order`, title: '🛍️ Order on WhatsApp' } },
          { type: 'reply', reply: { id: `btn_menu`, title: '🍦 Explore Menu' } }, // Fallback reply button incase URL fails
          { type: 'reply', reply: { id: `btn_ask`, title: '💬 Ask Me Anything' } }
        ]
      }
    };
  }
}
else if (action === 'menu_cta') {
  text = `Sure! 🍦 You can explore the full menu and place an order securely here.`;
  if (ctaUrl) {
    interactive = {
      type: 'cta_url',
      body: { text },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: '🍦 Explore Menu',
          url: ctaUrl
        }
      }
    };
  }
}
else if (action === 'start_whatsapp_order') {
  text = `Absolutely! 😋 What would you like to order?`;
}
else if (action === 'start_questions') {
  text = `Of course! 😊 What would you like to know?`;
}
else if (action === 'reply') {
  text = `${reply}`;
}

\n\n"""
            node['parameters']['jsCode'] = new_build_code + final_block
            print('  Updated Build Outbound Message.')

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
