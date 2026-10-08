import urllib.request, json, os

key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
wf = json.loads(urllib.request.urlopen(req).read().decode())

for n in wf['nodes']:
    if 'Send Template' in n['name']:
        n['parameters']['jsonBody'] = "={{ JSON.stringify({ from: '+919180348124', to: $json.phone, type: 'template', template: { name: $json.template_name, language: { code: $json.language }, components: $json.components || [] } }) }}"
        for param in n['parameters']['headerParameters']['parameters']:
            if param['name'] == 'X-API-Key':
                param['value'] = '={{ $json.ycloud_api_key }}'

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
