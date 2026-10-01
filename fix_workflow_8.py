import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

def remove_env(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and '$env.SUPABASE_URL' in v:
                obj[k] = v.replace("{{ $env.SUPABASE_URL || 'https://clqzctntkwzahdfjeqlx.supabase.co' }}", "https://clqzctntkwzahdfjeqlx.supabase.co")
                obj[k] = obj[k].replace('{{ $env.SUPABASE_URL || "https://clqzctntkwzahdfjeqlx.supabase.co" }}', 'https://clqzctntkwzahdfjeqlx.supabase.co')
            elif isinstance(v, (dict, list)):
                remove_env(v)
    elif isinstance(obj, list):
        for i in range(len(obj)):
            if isinstance(obj[i], str) and '$env.SUPABASE_URL' in obj[i]:
                obj[i] = obj[i].replace("{{ $env.SUPABASE_URL || 'https://clqzctntkwzahdfjeqlx.supabase.co' }}", "https://clqzctntkwzahdfjeqlx.supabase.co")
                obj[i] = obj[i].replace('{{ $env.SUPABASE_URL || "https://clqzctntkwzahdfjeqlx.supabase.co" }}', 'https://clqzctntkwzahdfjeqlx.supabase.co')
            elif isinstance(obj[i], (dict, list)):
                remove_env(obj[i])

for n in wf['nodes']:
    remove_env(n['parameters'])

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
