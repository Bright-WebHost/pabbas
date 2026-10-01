import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

for n in wf['nodes']:
    if n['name'] == 'Log Blast':
        print(json.dumps(n['parameters'], indent=2))
    if n['name'] == 'Parse Send Result':
        print("\n=== Parse Send Result ===")
        print(json.dumps(n['parameters'], indent=2))

# Also check the latest execution for Send Template output
req2 = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions?limit=1&workflowId=k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
data = json.loads(res2.read().decode())
exec_id = data['data'][0]['id']

req3 = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/executions/{exec_id}?includeData=true', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res3 = urllib.request.urlopen(req3)
exec_data = json.loads(res3.read().decode())
run_data = exec_data['data']['resultData']['runData']

print("\n=== All nodes that ran ===")
for name in run_data.keys():
    print(f"  - {name}")

if 'Send Template (TODO: verify YCloud payload)' in run_data:
    st = run_data['Send Template (TODO: verify YCloud payload)'][0]['data']['main'][0]
    print("\n=== Send Template output ===")
    for item in st:
        print(json.dumps(item['json'], indent=2))

if 'Parse Send Result' in run_data:
    pr = run_data['Parse Send Result'][0]['data']['main'][0]
    print("\n=== Parse Send Result output ===")
    for item in pr:
        print(json.dumps(item['json'], indent=2))
