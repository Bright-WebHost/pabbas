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

for node in wf['nodes']:
    if node['name'] == 'Place Final Order':
        body = node['parameters']['jsonBody']
        # Replace mapping to include menu_item_id
        body = body.replace(
            "cart_items: $json.items.map(i=>({name:i.item_name || i.name, quantity:i.quantity})),",
            "cart_items: $json.items.map(i=>({name:i.item_name || i.name, quantity:i.quantity, menu_item_id:i.menu_item_id})),"
        )
        node['parameters']['jsonBody'] = body
        break

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
print('Fixed Place Final Order to include menu_item_id!')
