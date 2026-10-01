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
    print('Updating Route Inbound Message to fix isNew detection...')
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
let isNew = !context.history || context.history.length <= 1;

if (context.history && context.history.length > 1) {
  // history is ordered by created_at ascending (oldest first, newest last)
  // The very last message is the current one we just saved.
  // The second-to-last message is their previous interaction.
  const currentMsg = context.history[context.history.length - 1];
  const previousMsg = context.history[context.history.length - 2];
  
  if (currentMsg.created_at && previousMsg.created_at) {
    const currentTime = new Date(currentMsg.created_at).getTime();
    const previousTime = new Date(previousMsg.created_at).getTime();
    
    const hoursSinceLast = (currentTime - previousTime) / (1000 * 60 * 60);
    const greetings = ['hi', 'hello', 'hey', 'start', 'menu'];
    
    // If it's been more than 2 hours AND they started with a greeting, treat as NEW!
    if (hoursSinceLast > 2 && greetings.includes(textLower)) {
      isNew = true;
    }
  }
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

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
