import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions?limit=3&workflowId=k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())

for ex in data['data']:
    print(f"ID: {ex['id']} | Status: {ex.get('status','?')} | Finished: {ex.get('stoppedAt','?')}")

# Get the latest one with full data
exec_id = data['data'][0]['id']
req2 = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/executions/{exec_id}?includeData=true', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())

run_data = exec_data['data']['resultData']['runData']
for node_name, runs in run_data.items():
    status = runs[0].get('executionStatus', '?')
    error = runs[0].get('error')
    output_items = 0
    if runs[0].get('data', {}).get('main'):
        for branch in runs[0]['data']['main']:
            if branch:
                output_items += len(branch)
    err_msg = ''
    if error:
        err_msg = f' ERROR: {error.get("message", str(error)[:100])}'
    print(f"  {node_name}: {status} ({output_items} items){err_msg}")
