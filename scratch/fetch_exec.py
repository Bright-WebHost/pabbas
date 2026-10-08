import json, urllib.request
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

url = 'https://staff.brightmedia.tech/api/v1/executions?workflowId=BfhcbxFiXa4Vga51&limit=1'
req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = json.loads(urllib.request.urlopen(req).read().decode())
exec_id = res['data'][0]['id']

url = f'https://staff.brightmedia.tech/api/v1/executions/{exec_id}'
req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
details = json.loads(urllib.request.urlopen(req).read().decode())

for node, node_data in details.get('data', {}).get('resultData', {}).get('runData', {}).items():
    if 'YCloud' in node or 'Build Outbound Message' in node:
        if node_data:
            last_run = node_data[-1]
            if last_run.get('error'):
                print(f"Error in {node}: {last_run['error']}")
            elif last_run.get('data'):
                out = last_run['data'].get('main', [])
                if out and out[0]:
                    print(f"{node} output: {json.dumps(out[0])[:1500]}")
