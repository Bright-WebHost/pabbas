import urllib.request, json

key = None
with open('c:/brightmedia/pabbas/.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

wf_id = 'BfhcbxFiXa4Vga51'
req = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
wf = json.loads(urllib.request.urlopen(req).read().decode())

new_code = '''const source = $('Build AI Order Request').first().json;
const context = source.context || {};
const raw = String($input.first().json.output || '').replace(/```json/gi, '').replace(/```/g, '').trim();
const norm = (v) => String(v || '').toLowerCase().replace(/\\s+/g, ' ').trim();
const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, channel_user_id: source.channel_user_id, action: 'reply', reply: 'Tell me what you would like to order.', order_type: 'pickup', items: [], total: 0, order_number: null, original_items: [] };
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
  out.order_type = parsed.order_type || 'pickup';
  return [{json: out}];
}

if (parsed.action === 'add' || parsed.action === 'remove') {
  const menu = new Map();
  for (const line of (typeof context.menu === 'string' ? context.menu.split('\\n') : [])) { const i = line.lastIndexOf('|'); if (i > 0) menu.set(norm(line.slice(0, i)), { name: line.slice(0, i).trim(), price: Number(line.slice(i + 1)) || 0 }); }
  for (const candidate of (Array.isArray(parsed.items) ? parsed.items : [])) { 
    const item = menu.get(norm(candidate?.name)); 
    const quantity = Math.round(Number(candidate?.quantity)); 
    if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) { 
      out.reply = !item ? `I'm sorry, I couldn't find "${candidate?.name}" on our current menu. Could you please check the menu or clarify?` : 'Please choose a quantity between 1 and 50.'; 
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
  return out.items.map(i => ({ json: { ...out, item: i } }));
}

// Fallback logic for when AI intent is order, but action is something else (like reply)
out.action = 'reply';
out.reply = String(parsed.reply || "I didn't understand. Can you rephrase?");
return [{ json: out }];
'''

for node in wf['nodes']:
    if node['name'] == 'Validate Menu And Price':
        node['parameters']['jsCode'] = new_code

payload = { 'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections'], 'settings': wf['settings'] }
req_put = urllib.request.Request(
    f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}',
    data=json.dumps(payload).encode(),
    headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'},
    method='PUT'
)
res_put = urllib.request.urlopen(req_put)
print('Workflow fixed!')
