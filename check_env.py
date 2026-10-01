import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

def find_env(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and '$env' in v:
                print('Found $env:', v)
            elif isinstance(v, (dict, list)):
                find_env(v)
    elif isinstance(obj, list):
        for i in range(len(obj)):
            if isinstance(obj[i], str) and '$env' in obj[i]:
                print('Found $env:', obj[i])
            elif isinstance(obj[i], (dict, list)):
                find_env(obj[i])

find_env(wf)
