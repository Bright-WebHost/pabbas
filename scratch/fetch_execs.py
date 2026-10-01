import json, urllib.request
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

def get_exec(wid):
    url = 'https://staff.brightmedia.tech/api/v1/executions?workflowId=' + wid + '&limit=5'
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
    res = json.loads(urllib.request.urlopen(req).read().decode())
    print('Executions for', wid)
    for ex in res['data']:
        print('ID:', ex['id'], 'Status:', ex['status'], 'Started:', ex['startedAt'])
        
        if ex['status'] == 'error':
            exec_url = 'https://staff.brightmedia.tech/api/v1/executions/' + str(ex['id'])
            req2 = urllib.request.Request(exec_url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
            ex_data = json.loads(urllib.request.urlopen(req2).read().decode())
            print('ERROR DATA:', json.dumps(ex_data.get('data', {}).get('resultData', {}).get('error', {}), indent=2))

get_exec('bgDd5V7r7LaLo0qb') # Agent Reply
get_exec('k7mayj1bhUGCmz8x') # Blast
