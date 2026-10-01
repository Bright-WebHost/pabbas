import urllib.request, json
import os

key = None
supabase_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY='): supabase_key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

for n in wf['nodes']:
    if n['name'] == 'Get Customers':
        n['parameters']['authentication'] = 'none'
        if 'credentials' in n:
            del n['credentials']
        
        headers = n['parameters'].get('headerParameters', {}).get('parameters', [])
        
        # Remove old Content-Type if it exists so we don't duplicate
        headers = [h for h in headers if h['name'] != 'Content-Type']
        
        headers.append({'name': 'apikey', 'value': supabase_key})
        headers.append({'name': 'Authorization', 'value': f'Bearer {supabase_key}'})
        headers.append({'name': 'Content-Type', 'value': 'application/json'})
        
        if 'headerParameters' not in n['parameters']:
            n['parameters']['headerParameters'] = {}
        n['parameters']['headerParameters']['parameters'] = headers

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
