import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

# Check the full workflow to understand the Loop node connections
req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

# Print connections
print("=== CONNECTIONS ===")
print(json.dumps(wf['connections'], indent=2))

# Print Loop Customers node details
for n in wf['nodes']:
    if n['name'] == 'Loop Customers':
        print("\n=== Loop Customers Node ===")
        print(json.dumps(n, indent=2))
