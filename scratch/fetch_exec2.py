import json, urllib.request
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

url = 'https://staff.brightmedia.tech/api/v1/executions?workflowId=BfhcbxFiXa4Vga51&limit=5'
req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = json.loads(urllib.request.urlopen(req).read().decode())

for ex in res['data']:
    print("ID: " + str(ex['id']) + ", Status: " + str(ex.get('status')))
    
    # fetch detail
    url2 = 'https://staff.brightmedia.tech/api/v1/executions/' + str(ex['id'])
    req2 = urllib.request.Request(url2, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
    details = json.loads(urllib.request.urlopen(req2).read().decode())
    
    for node, node_data in details.get('data', {}).get('resultData', {}).get('runData', {}).items():
        if 'YCloud' in node or 'Build Outbound Message' in node:
            if node_data:
                last_run = node_data[-1]
                if last_run.get('error'):
                    print("Error in " + node + ": " + str(last_run['error']))
                elif last_run.get('data'):
                    out = last_run['data'].get('main', [])
                    if out and out[0]:
                        print(node + " output: " + json.dumps(out[0])[:1500])
