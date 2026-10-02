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

new_node = {
  'parameters': {
    'method': 'POST',
    'url': 'https://pabbas-one.vercel.app/api/ai/tools/cart',
    'authentication': 'none',
    'sendBody': True,
    'specifyBody': 'json',
    'jsonBody': "={{ JSON.stringify({ channel_user_id: $('Extract Inbound Message').first().json.channel_user_id, action: 'get' }) }}",
    'sendHeaders': True,
    'headerParameters': {
      'parameters': [
        { 'name': 'x-pabbas-ai-secret', 'value': 'OST5qgjSrWK4NU8h_ZwnwNhAvCqBHUBOorEIWwAj0ag' }
      ]
    }
  },
  'name': 'Fetch Pending Cart',
  'type': 'n8n-nodes-base.httpRequest',
  'typeVersion': 4.2,
  'position': [-2440, 1260],
  'id': 'fetch-pending-cart-id'
}

# Update Build AI Order Request
for node in wf['nodes']:
    if node['name'] == 'Build AI Order Request':
        node['parameters']['jsCode'] = '''const input = $('Extract Inbound Message').first().json;
const context = $('Retrieve Chat Context').first().json || {};
const cart = $('Fetch Pending Cart').first().json || { empty: true, items: [] };
context.pending_cart = cart;
return [{ json: { customer_phone: input.phone, customer_name: input.customer_name, channel_user_id: input.channel_user_id, message: input.content, context } }];'''

# Update connections: Retrieve Chat Context -> Fetch Pending Cart -> Build AI Order Request
for conn_list in wf['connections']['Retrieve Chat Context']['main'][0]:
    if conn_list['node'] == 'Build AI Order Request':
        conn_list['node'] = 'Fetch Pending Cart'

wf['connections']['Fetch Pending Cart'] = { 'main': [[{ 'node': 'Build AI Order Request', 'type': 'main', 'index': 0 }]] }

# Ensure no duplicate node names
wf['nodes'] = [n for n in wf['nodes'] if n['name'] != 'Fetch Pending Cart']
wf['nodes'].append(new_node)

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
print('Workflow updated with Fetch Pending Cart')
