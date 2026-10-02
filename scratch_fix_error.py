import urllib.request, json
key = None
with open('c:/brightmedia/pabbas/.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
wf_id = 'BfhcbxFiXa4Vga51'
req = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

for node in wf['nodes']:
    if node['name'] == 'Pabbas AI Order Agent':
        prompt = node['parameters']['options']['systemMessage']
        # Fix the output format to include action
        if '"action": "add|remove|checkout|null"' not in prompt:
            prompt = prompt.replace('"intent": "order|info|status|menu|other",', '"intent": "order|info|status|menu|other",\n  "action": "add|remove|checkout|null",')
        node['parameters']['options']['systemMessage'] = prompt
        
    if node['name'] == 'Validate Menu And Price':
        code = node['parameters']['jsCode']
        # If action is undefined/null but we have items, default it to 'add'
        code = code.replace("if (parsed.action === 'add' || parsed.action === 'remove' || parsed.action === 'create') {", "if (!parsed.action && out.items.length > 0) parsed.action = 'add';\nif (parsed.action === 'add' || parsed.action === 'remove' || parsed.action === 'create') {")
        node['parameters']['jsCode'] = code

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}
req_put = urllib.request.Request(
    f'https://staff.brightmedia.tech/api/v1/workflows/{wf_id}',
    data=json.dumps(payload).encode(),
    headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'},
    method='PUT'
)
res_put = urllib.request.urlopen(req_put)
print('Updated Validate node and AI prompt to fix missing action!')
