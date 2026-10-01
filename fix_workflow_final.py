import urllib.request, json

key = None
supabase_key = None
with open('.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
        if line.startswith('SUPABASE_SECRET_KEY='): supabase_key = line.split('=', 1)[1].strip()

print(f'Supabase key found: {supabase_key[:20]}...')

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

supabase_nodes = ['Get Customers', 'Log Blast', 'Update Customer']

for n in wf['nodes']:
    if n['name'] in supabase_nodes:
        n['parameters']['authentication'] = 'none'
        if 'nodeCredentialType' in n['parameters']:
            del n['parameters']['nodeCredentialType']
        if 'credentials' in n:
            del n['credentials']
        
        n['parameters']['sendHeaders'] = True
        n['parameters']['headerParameters'] = {
            'parameters': [
                {'name': 'apikey', 'value': supabase_key},
                {'name': 'Authorization', 'value': f'Bearer {supabase_key}'},
                {'name': 'Content-Type', 'value': 'application/json'}
            ]
        }
        print(f'Fixed node: {n["name"]}')

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
