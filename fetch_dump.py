import urllib.request, json
n8n_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): n8n_key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions?limit=1&workflowId=k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': n8n_key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
exec_id = data['data'][0]['id']

req2 = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/executions/{exec_id}?includeData=true', headers={'X-N8N-API-KEY': n8n_key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())
run_data = exec_data['data']['resultData']['runData']

print(f"Exec ID: {exec_id}")
for node, v in run_data.items():
    print(f"{node}: {v[0].get('executionStatus')}")
    if v[0].get('error'):
        print(f"  Error: {v[0]['error']}")
