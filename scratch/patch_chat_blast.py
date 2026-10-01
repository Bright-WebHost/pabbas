import json, urllib.request

key = None
anon_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()
        if line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='): anon_key = line.split('=', 1)[1].strip()

# Patch Agent Reply Sender
with open('scratch/agent_reply_sender.json', 'r', encoding='utf-8') as f:
    wf1 = json.load(f)

for node in wf1['nodes']:
    if node['name'] == 'Verify Staff':
        for param in node['parameters']['headerParameters']['parameters']:
            if param['name'] == 'apikey':
                param['value'] = anon_key
    elif node['name'] == 'Send WhatsApp Reply':
        body = node['parameters']['jsonBody']
        if body.startswith('=={{'):
            node['parameters']['jsonBody'] = body.replace('=={{', '={{', 1)

with open('scratch/agent_reply_sender_patched.json', 'w') as f:
    json.dump(wf1, f, indent=2)

# Patch Blast Sender
with open('scratch/blast_sender.json', 'r', encoding='utf-8') as f:
    wf2 = json.load(f)

for node in wf2['nodes']:
    if node['name'] == 'Verify Staff':
        for param in node['parameters']['headerParameters']['parameters']:
            if param['name'] == 'apikey':
                param['value'] = anon_key
    elif node['name'].startswith('Send Template'):
        node['disabled'] = False
        node['name'] = 'Send Template'
        node['parameters']['url'] = 'https://api.ycloud.com/v2/whatsapp/messages'
        # Set headers
        node['parameters']['headerParameters']['parameters'] = [
            { 'name': 'Content-Type', 'value': 'application/json' },
            { 'name': 'X-API-Key', 'value': '2fe76241b7ddf5aef333ebf96dcaeeb1' }
        ]
        # Remove generic credential because we use header explicitly
        if 'authentication' in node['parameters']: del node['parameters']['authentication']
        if 'genericAuthType' in node['parameters']: del node['parameters']['genericAuthType']
        
        # Set body
        node['parameters']['jsonBody'] = "={{ JSON.stringify({ from: '+919180348124', to: $json.phone, type: 'template', template: { name: $json.template, language: { code: $json.language }, components: $json.header_image ? [ { type: 'header', parameters: [ { type: 'image', image: { link: $json.header_image } } ] } ] : [] } }) }}"

with open('scratch/blast_sender_patched.json', 'w') as f:
    json.dump(wf2, f, indent=2)

# Upload back to n8n
def upload(wf):
    url = 'https://staff.brightmedia.tech/api/v1/workflows/' + wf['id']
    payload = {
        'name': wf.get('name'),
        'nodes': wf.get('nodes'),
        'connections': wf.get('connections'),
        'settings': wf.get('settings')
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), method='PUT', headers={
        'X-N8N-API-KEY': key, 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    })
    urllib.request.urlopen(req)

upload(wf1)
print("Uploaded Agent Reply")
upload(wf2)
print("Uploaded Blast Sender")
