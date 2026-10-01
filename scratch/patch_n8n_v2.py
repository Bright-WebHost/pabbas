import urllib.request
import json

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
    # Sending only nodes and connections as per n8n API docs for update
    payload = {
        'nodes': data.get('nodes', []),
        'connections': data.get('connections', {}),
        'name': data.get('name', '')
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
        print(f"HTTP {e.code} ERROR RESPONSE:")
        print(e.read().decode('utf-8'))
        raise e

def patch_supabase_apikey(nodes):
    for node in nodes:
        if node['type'] == 'n8n-nodes-base.httpRequest' and node.get('credentials', {}).get('httpCustomAuth', {}).get('name') == 'Supabase Service Role':
            params = node.setdefault('parameters', {})
            params['sendHeaders'] = True
            headers = params.setdefault('headerParameters', {}).setdefault('parameters', [])
            has_apikey = any(h.get('name', '').lower() == 'apikey' for h in headers)
            if not has_apikey:
                headers.append({
                    'name': 'apikey',
                    'value': '={{ $env.SUPABASE_SECRET_KEY }}'
                })
                print(f"  Added apikey header to node: {node['name']}")
                
        if node['name'] == 'Verify Staff' and node['type'] == 'n8n-nodes-base.httpRequest':
            node['credentials'] = {
                'httpCustomAuth': {
                    'id': 'RImgl1ED9KhO0wG4',
                    'name': 'Supabase Service Role'
                }
            }
            params = node['parameters']
            params['authentication'] = 'predefinedCredentialType'
            params['nodeCredentialType'] = 'httpCustomAuth'
            params['sendHeaders'] = True
            headers = params.setdefault('headerParameters', {}).setdefault('parameters', [])
            new_headers = []
            has_apikey = False
            for h in headers:
                if h['name'] == 'apikey':
                    new_headers.append({'name': 'apikey', 'value': '={{ $env.SUPABASE_SECRET_KEY }}'})
                    has_apikey = True
                elif h['name'] != 'Authorization':
                    new_headers.append(h)
            if not has_apikey:
                new_headers.append({'name': 'apikey', 'value': '={{ $env.SUPABASE_SECRET_KEY }}'})
            params['headerParameters']['parameters'] = new_headers
            print('  Fixed Verify Staff authentication')

try:
    print('Processing Status Notifier...')
    wf_status = get_workflow('24IaEnLI3RCYU6da')
    patch_supabase_apikey(wf_status['nodes'])

    for node in wf_status['nodes']:
        if node['name'] == 'Extract Data':
            node['parameters']['jsCode'] = "const webhookData = $('Status Webhook').first().json.body;\n\nfor (const item of $input.all()) {\n  item.json.order_number = webhookData.order_number;\n  item.json.status = webhookData.status;\n  item.json.cancel_reason = webhookData.cancel_reason || null;\n}\n\nreturn $input.all();"
            print('  Updated Extract Data logic')
        if node['name'] == 'Update Status':
            node['parameters']['jsonBody'] = "={{ JSON.stringify($json.status === 'cancelled' ? { status: $json.status, cancelled_by: 'staff:' + $json.staff, cancelled_at: new Date().toISOString(), cancel_reason: $json.cancel_reason } : { status: $json.status }) }}"
            print('  Updated Update Status body')
        if node['name'] == 'Build Message':
            old_code = node['parameters']['jsCode']
            if 'cancel_reason' not in old_code:
                node['parameters']['jsCode'] = old_code.replace(
                    "message: `Your Pabbas order #${orderNumber} has been ${status}.`",
                    "message: `Your Pabbas order #${orderNumber} has been ${status}.` + ($json.cancel_reason ? `\\n\\nReason: ${$json.cancel_reason}` : '')"
                )
                print('  Updated Build Message logic')

    update_workflow('24IaEnLI3RCYU6da', wf_status)
    print('Saved Status Notifier.')

    print('\nProcessing WhatsApp AI Order Bridge...')
    wf_bridge = get_workflow('BfhcbxFiXa4Vga51')
    patch_supabase_apikey(wf_bridge['nodes'])
    update_workflow('BfhcbxFiXa4Vga51', wf_bridge)
    print('Saved WhatsApp AI Order Bridge.')
except Exception as e:
    print(f"Error: {e}")
