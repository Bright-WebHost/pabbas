import json, urllib.request
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

url = 'https://staff.brightmedia.tech/api/v1/executions?workflowId=24IaEnLI3RCYU6da&limit=5'
req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = json.loads(urllib.request.urlopen(req).read().decode())
for exec_info in res['data']:
    print("Execution " + str(exec_info['id']) + " at " + str(exec_info.get('startedAt', 'Unknown')))
    url_details = 'https://staff.brightmedia.tech/api/v1/executions/' + str(exec_info["id"])
    req_details = urllib.request.Request(url_details, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
    details = json.loads(urllib.request.urlopen(req_details).read().decode())
    keys = list(details.get('data', {}).get('resultData', {}).get('runData', {}).keys())
    print('  Nodes:', keys)
