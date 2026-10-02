import urllib.request, json
key = None
with open('c:/brightmedia/pabbas/.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
        if line.startswith('SUPABASE_SECRET_KEY='): sb_key = line.split('=', 1)[1].strip()
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='): sb_url = line.split('=', 1)[1].strip()

wf_id = 'BfhcbxFiXa4Vga51'
req = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

# 1. Create Fetch Menu Items Node
fetch_menu_node = {
    "name": "Fetch Menu Items",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [-3050, 1750],
    "id": "fetch-menu-items-node",
    "parameters": {
        "method": "GET",
        "url": f"{sb_url}/rest/v1/menu_items?select=id,item_name,price",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "apikey", "value": sb_key},
                {"name": "Authorization", "value": f"Bearer {sb_key}"},
                {"name": "Content-Type", "value": "application/json"}
            ]
        },
        "options": {}
    }
}

# Replace the connection from Retrieve Chat Context to Route Inbound Message
# Retrieve Chat Context -> Fetch Menu Items -> Route Inbound Message
# Find Retrieve Chat Context outputs
for conn_list in wf['connections'].get('Retrieve Chat Context', {}).get('main', []):
    for c in conn_list:
        if c['node'] == 'Route Inbound Message':
            c['node'] = 'Fetch Menu Items'

wf['connections']['Fetch Menu Items'] = {
    "main": [
        [{"node": "Route Inbound Message", "type": "main", "index": 0}]
    ]
}

# Add node if not exists
node_exists = False
for n in wf['nodes']:
    if n['name'] == 'Fetch Menu Items':
        node_exists = True
        n.update(fetch_menu_node)
if not node_exists:
    wf['nodes'].append(fetch_menu_node)


# 2. Update Validate Menu And Price
for node in wf['nodes']:
    if node['name'] == 'Validate Menu And Price':
        code = node['parameters']['jsCode']
        # Replace the menu map building code
        new_menu_code = """
const menu = new Map();
const menuData = $('Fetch Menu Items').first().json || [];
// Supabase returns an array of objects
for (const item of (Array.isArray(menuData) ? menuData : menuData.data || [])) {
  menu.set(norm(item.item_name), { id: item.id, name: item.item_name, price: item.price });
}
"""
        import re
        # Find the old menu parsing code and replace
        old_menu_pattern = r'const menu = new Map\(\);.*?for\s*\(const line of.*?\{.*?\}'
        code = re.sub(old_menu_pattern, new_menu_code.strip(), code, flags=re.DOTALL)
        
        # Make sure we add menu_item_id to the output array
        code = code.replace("out.items.push({ name: item.name, quantity, price: item.price });", "out.items.push({ name: item.name, quantity, price: item.price, menu_item_id: item.id });")
        
        node['parameters']['jsCode'] = code

# 3. Update Cart Add Item & Cart Remove Item
for node in wf['nodes']:
    if node['name'] in ['Cart Add Item', 'Cart Remove Item']:
        body = node['parameters']['jsonBody']
        # Change item_name to menu_item_id
        if 'item_name' in body:
            body = body.replace("item_name: $json.item.name", "menu_item_id: $json.item.menu_item_id")
        node['parameters']['jsonBody'] = body

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
print('Workflow updated with Fetch Menu Items and menu_item_id fix!')
