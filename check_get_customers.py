import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())
for n in wf['nodes']:
    if n['name'] == 'Get Customers':
        print(json.dumps(n, indent=2))
