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
        for h in n['parameters']['headerParameters']['parameters']:
            if h['name'] == 'apikey':
                val = h['value']
                if val and len(val) > 20:
                    print(f"apikey: {val[:20]}... (length {len(val)}) - GOOD")
                else:
                    print(f"apikey: {val} - BAD")
            if h['name'] == 'Authorization':
                val = h['value']
                if val and 'eyJ' in val:
                    print(f"Authorization: Bearer eyJ... (length {len(val)}) - GOOD")
                else:
                    print(f"Authorization: {val} - BAD")
