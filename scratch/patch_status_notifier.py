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
    print('Updating Status Notifier workflow...')
    wf = get_workflow('24IaEnLI3RCYU6da')
    
    # 1. Find the hardcoded token from Update Status
    hardcoded_token = None
    for node in wf['nodes']:
        if node['name'] == 'Update Status':
            headers = node['parameters'].get('headerParameters', {}).get('parameters', [])
            for h in headers:
                if h['name'] == 'apikey':
                    hardcoded_token = h['value']
                    break
    
    if not hardcoded_token:
        print("Could not find hardcoded token in Update Status!")
        exit(1)
        
    print(f"Found token to use for patching.")

    # 2. Update Verify Staff node
    for node in wf['nodes']:
        if node['name'] == 'Verify Staff':
            headers = node['parameters'].get('headerParameters', {}).get('parameters', [])
            
            # Find and replace $env
            for h in headers:
                if h['name'] == 'apikey' and '$env' in str(h['value']):
                    h['value'] = hardcoded_token
                    print('  Replaced $env in Verify Staff apikey header.')
            
            # Also ensure Authorization header exists if it's missing (just in case the credential doesn't provide it)
            has_auth = any(h['name'] == 'Authorization' for h in headers)
            if not has_auth:
                headers.append({
                    "name": "Authorization",
                    "value": f"Bearer {hardcoded_token}"
                })
                print('  Added Authorization header to Verify Staff.')

    update_workflow('24IaEnLI3RCYU6da', wf)
    print('Successfully updated Status Notifier workflow!')

except Exception as e:
    print(f"Error: {e}")
