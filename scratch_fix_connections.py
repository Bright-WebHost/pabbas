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

# Rewire all connections to 'Build AI Order Request' to point to 'Fetch Pending Cart' instead
for src, outs in wf['connections'].items():
    if src == 'Fetch Pending Cart':
        continue
    for main_list in outs.get('main', []):
        for c in main_list:
            if c['node'] == 'Build AI Order Request':
                c['node'] = 'Fetch Pending Cart'

# Connect 'Fetch Pending Cart' to 'Build AI Order Request'
wf['connections']['Fetch Pending Cart'] = { 'main': [[{ 'node': 'Build AI Order Request', 'type': 'main', 'index': 0 }]] }

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
print('Connections fixed!')
