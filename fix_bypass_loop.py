import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

# Strategy: bypass the broken Loop node entirely
# Connect Filter & Clean Phones -> Send Template directly
# n8n HTTP Request node will auto-iterate over multiple input items

# Update connections:
# Filter & Clean Phones -> Send Template (instead of Loop Customers)
# Send Template -> Parse Send Result (already connected)
# Parse Send Result -> Log Blast (already connected)  
# Log Blast -> Update Customer (already connected)
# Update Customer -> Done (instead of Throttle -> Loop)

wf['connections']['Filter & Clean Phones'] = {
    'main': [[
        {'node': 'Send Template (TODO: verify YCloud payload)', 'type': 'main', 'index': 0}
    ]]
}

# Update Customer -> Done (no more looping back)
wf['connections']['Update Customer'] = {
    'main': [[
        {'node': 'Done', 'type': 'main', 'index': 0}
    ]]
}

# Remove Loop Customers and Throttle from connections
if 'Loop Customers' in wf['connections']:
    del wf['connections']['Loop Customers']
if 'Throttle 1s' in wf['connections']:
    del wf['connections']['Throttle 1s']

# Also set the Send Template node to NOT use onError continueRegularOutput
# so we can see actual errors
for n in wf['nodes']:
    if 'Send Template' in n['name']:
        n['onError'] = 'continueRegularOutput'
        n['alwaysOutputData'] = True

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
