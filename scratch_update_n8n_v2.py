import urllib.request, json
key = None
with open('c:/brightmedia/pabbas/.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
wf_id = 'BfhcbxFiXa4Vga51'
req = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

# Update AI prompt
for node in wf['nodes']:
    if node['name'] == 'Pabbas AI Order Agent':
        prompt = node['parameters']['options']['systemMessage']
        prompt = prompt.replace('When a customer wants to order items, do NOT call the Pabbas Menu or Pabbas Cart tools.', 'When a customer wants to order items or add to cart, do NOT call tools.')
        prompt = prompt.replace('Instead, return the JSON response directly with the item names and quantities from the customer\'s message.', 'Instead, output action: "add" or "remove" with the items.')
        prompt = prompt.replace('For cart inquiries like "What\'s in my cart?", use the Pabbas Cart tool with action "get".', 'For cart inquiries, check "pending_cart" in context and output reply. For checking out ("place order"), output action: "checkout".')
        prompt += '''
        
7. PENDING CART
The customer's current cart is in `context.pending_cart`.
If they add items, output: {"intent": "order", "action": "add", "items": [{"name": "...", "quantity": 1}]}
If they remove items, output: {"intent": "order", "action": "remove", "items": [{"name": "...", "quantity": 1}]}
If they confirm/checkout, output: {"intent": "order", "action": "checkout"}
If they ask what's in their cart, look at context.pending_cart and output a normal reply.
DO NOT call the Pabbas Cart tool.
'''
        node['parameters']['options']['systemMessage'] = prompt

# Update Validate Menu And Price
for node in wf['nodes']:
    if node['name'] == 'Validate Menu And Price':
        node['parameters']['jsCode'] = '''const source = $('Build AI Order Request').first().json;
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

if (!out.items.length && (parsed.action === 'add' || parsed.action === 'remove')) { 
  out.reply = String(parsed.reply || "I didn't catch any items. What would you like to order?"); 
  out.action = 'reply';
  return [{ json: out }]; 
}

if (parsed.action === 'add' || parsed.action === 'remove') {
  out.action = parsed.action;
  out.original_items = out.items; // for downstream looping if needed
  // if single operation per HTTP node, we'll return an array of items for looping
  return out.items.map(i => ({ json: { ...out, item: i } }));
}

out.action = 'create'; // Fallback
out.order_type = 'pickup';
return [{ json: out }];
'''

# Update Order Action Switch
for node in wf['nodes']:
    if node['name'] == 'Order Action Switch':
        # check if already added
        rules = node['parameters']['rules']['values']
        if not any(r.get('outputKey') == 'add' for r in rules):
            rules.append({'conditions':{'conditions':[{'leftValue':'={{ $json.action }}', 'rightValue':'add', 'operator':{'type':'string','operation':'equals'}}],'combinator':'and'},'renameOutput':True,'outputKey':'add'})
            rules.append({'conditions':{'conditions':[{'leftValue':'={{ $json.action }}', 'rightValue':'remove', 'operator':{'type':'string','operation':'equals'}}],'combinator':'and'},'renameOutput':True,'outputKey':'remove'})
            rules.append({'conditions':{'conditions':[{'leftValue':'={{ $json.action }}', 'rightValue':'checkout', 'operator':{'type':'string','operation':'equals'}}],'combinator':'and'},'renameOutput':True,'outputKey':'checkout'})

# Create Cart Update Nodes
add_cart_node = {
  'parameters': {
    'method': 'POST', 'url': 'https://pabbas-one.vercel.app/api/ai/tools/cart', 'sendBody': True, 'specifyBody': 'json',
    'jsonBody': "={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'add', item_name: $json.item.name, quantity: $json.item.quantity }) }}",
    'sendHeaders': True, 'headerParameters': { 'parameters': [{ 'name': 'x-pabbas-ai-secret', 'value': 'OST5qgjSrWK4NU8h_ZwnwNhAvCqBHUBOorEIWwAj0ag' }] }
  },
  'name': 'Cart Add Item', 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [-700, 1500], 'id': 'cart-add-node'
}
remove_cart_node = {
  'parameters': {
    'method': 'POST', 'url': 'https://pabbas-one.vercel.app/api/ai/tools/cart', 'sendBody': True, 'specifyBody': 'json',
    'jsonBody': "={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'remove', item_name: $json.item.name, quantity: $json.item.quantity }) }}",
    'sendHeaders': True, 'headerParameters': { 'parameters': [{ 'name': 'x-pabbas-ai-secret', 'value': 'OST5qgjSrWK4NU8h_ZwnwNhAvCqBHUBOorEIWwAj0ag' }] }
  },
  'name': 'Cart Remove Item', 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [-700, 1700], 'id': 'cart-remove-node'
}

reply_add_node = {
  'parameters': { 'jsCode': "const first = $input.first().json; return [{json:{...first, reply: \"I've updated your cart! Would you like to add anything else or place the order?\"}}]" },
  'name': 'Build Add Reply', 'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [-300, 1500], 'id': 'reply-add'
}
reply_rem_node = {
  'parameters': { 'jsCode': "const first = $input.first().json; return [{json:{...first, reply: \"I've removed that from your cart. Ready to order?\"}}]" },
  'name': 'Build Rem Reply', 'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [-300, 1700], 'id': 'reply-rem'
}

clear_cart_node = {
  'parameters': {
    'method': 'POST', 'url': 'https://pabbas-one.vercel.app/api/ai/tools/cart', 'sendBody': True, 'specifyBody': 'json',
    'jsonBody': "={{ JSON.stringify({ channel_user_id: $json.channel_user_id, action: 'clear' }) }}",
    'sendHeaders': True, 'headerParameters': { 'parameters': [{ 'name': 'x-pabbas-ai-secret', 'value': 'OST5qgjSrWK4NU8h_ZwnwNhAvCqBHUBOorEIWwAj0ag' }] }
  },
  'name': 'Clear Cart', 'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [-1200, 1376], 'id': 'clear-cart-node'
}

for node in wf['nodes']:
    if node['name'] == 'Create Draft Order':
        node['name'] = 'Place Final Order'
        node['parameters']['jsonBody'] = node['parameters']['jsonBody'].replace('$json.items', '$json.items.map(i=>({name:i.item_name || i.name, quantity:i.quantity}))')

# Update connections references to renamed node
for src, outs in list(wf['connections'].items()):
    if src == 'Create Draft Order':
        wf['connections']['Place Final Order'] = wf['connections'].pop('Create Draft Order')
    for main_list in wf['connections'].get(src, {}).get('main', []):
        for c in main_list:
            if c['node'] == 'Create Draft Order':
                c['node'] = 'Place Final Order'

# Add nodes if not exist
existing_names = [n['name'] for n in wf['nodes']]
nodes_to_add = []
for n in [add_cart_node, remove_cart_node, reply_add_node, reply_rem_node, clear_cart_node]:
    if n['name'] not in existing_names:
        nodes_to_add.append(n)
wf['nodes'] = [n for n in wf['nodes'] if n['name'] not in ['Agg Add', 'Agg Rem']]
wf['nodes'].extend(nodes_to_add)
if 'Agg Add' in wf['connections']: del wf['connections']['Agg Add']
if 'Agg Rem' in wf['connections']: del wf['connections']['Agg Rem']

# Connections
while len(wf['connections']['Order Action Switch']['main']) <= 6:
    wf['connections']['Order Action Switch']['main'].append([])
wf['connections']['Order Action Switch']['main'][4] = [{'node': 'Cart Add Item', 'type': 'main', 'index': 0}]
wf['connections']['Order Action Switch']['main'][5] = [{'node': 'Cart Remove Item', 'type': 'main', 'index': 0}]
wf['connections']['Order Action Switch']['main'][6] = [{'node': 'Place Final Order', 'type': 'main', 'index': 0}]

wf['connections']['Cart Add Item'] = {'main': [[{'node': 'Build Add Reply', 'type': 'main', 'index': 0}]]}
wf['connections']['Cart Remove Item'] = {'main': [[{'node': 'Build Rem Reply', 'type': 'main', 'index': 0}]]}

wf['connections']['Build Add Reply'] = {'main': [[{'node': 'Build Outbound Message', 'type': 'main', 'index': 0}]]}
wf['connections']['Build Rem Reply'] = {'main': [[{'node': 'Build Outbound Message', 'type': 'main', 'index': 0}]]}

wf['connections']['Place Final Order'] = {'main': [[{'node': 'Clear Cart', 'type': 'main', 'index': 0}]]}
wf['connections']['Clear Cart'] = {'main': [[{'node': 'Confirm Order', 'type': 'main', 'index': 0}]]}

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}
req_put = urllib.request.Request(
    f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}',
    data=json.dumps(payload).encode(),
    headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'},
    method='PUT'
)
res_put = urllib.request.urlopen(req_put)
print('Workflow fully updated!')
