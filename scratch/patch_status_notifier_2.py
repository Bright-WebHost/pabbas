import json
import urllib.request

key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='):
            key = line.split('=', 1)[1].strip()

def get_workflow(workflow_id):
    url = f'https://staff.brightmedia.tech/api/v1/workflows/{workflow_id}'
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read().decode())

def update_workflow(workflow_id, data):
    url = f'https://staff.brightmedia.tech/api/v1/workflows/{workflow_id}'
    payload = {
        'name': data.get('name'),
        'nodes': data.get('nodes'),
        'connections': data.get('connections'),
        'settings': data.get('settings')
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), method='PUT', headers={
        'X-N8N-API-KEY': key, 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        print(e.read().decode('utf-8'))
        raise e

try:
    print('Fixing Verify Staff node in Status Notifier...')
    wf = get_workflow('24IaEnLI3RCYU6da')
    
    # Find hardcoded token
    hardcoded_token = None
    for node in wf['nodes']:
        if node['name'] == 'Update Status':
            headers = node['parameters'].get('headerParameters', {}).get('parameters', [])
            for h in headers:
                if h['name'] == 'apikey':
                    hardcoded_token = h['value']
                    break
    
    for node in wf['nodes']:
        if node['name'] == 'Verify Staff':
            # Remove credential so it doesn't override our Authorization header!
            if 'credentials' in node:
                del node['credentials']
            if 'authentication' in node['parameters']:
                node['parameters']['authentication'] = 'none'
            
            headers = [
                {
                    "name": "Content-Type",
                    "value": "application/json"
                },
                {
                    "name": "apikey",
                    "value": hardcoded_token
                },
                {
                    "name": "Authorization",
                    "value": "Bearer {{$json.body.staff_token}}"
                }
            ]
            
            if 'headerParameters' not in node['parameters']:
                node['parameters']['headerParameters'] = {}
            
            node['parameters']['headerParameters']['parameters'] = headers
            print('  Fixed headers for Verify Staff and detached service role credential.')

    update_workflow('24IaEnLI3RCYU6da', wf)
    print('Successfully updated Status Notifier workflow!')

except Exception as e:
    print(f"Error: {e}")
