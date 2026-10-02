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
    if node['name'] == 'Validate Menu And Price':
        code = node['parameters']['jsCode']
        code = code.replace("out.action = 'create'; // Fallback", "out.action = parsed.action || 'reply'; // Fallback")
        if 'out.reply = parsed.reply;' not in code:
            code = code.replace("out.order_type = 'pickup';", "out.order_type = 'pickup';\nif (parsed.reply) out.reply = String(parsed.reply);")
        node['parameters']['jsCode'] = code
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
print('Fixed Validate fallback logic!')
