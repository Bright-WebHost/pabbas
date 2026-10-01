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
    print('Processing WhatsApp AI Order Bridge to restore return statement properly...')
    
    # Get original code from backup
    with open('scratch/backups/WhatsApp_AI_Order_Bridge_backup.json', 'r', encoding='utf-8') as f:
        backup = json.load(f)
    
    original_node = next(n for n in backup['nodes'] if n['name'] == 'Build Outbound Message')
    original_code = original_node['parameters']['jsCode']
    
    # Use real newline, not literal \\n
    final_block_index = original_code.find("// --------------------------------------------------\n// FINAL OUTGOING PAYLOAD")
    if final_block_index == -1:
        print("ERROR: Could not find final block in original code!")
        exit(1)
        
    final_block = original_code[final_block_index:]

    # Now get current workflow
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    for node in wf['nodes']:
        if node['name'] == 'Build Outbound Message':
            current_code = node['parameters']['jsCode']
            
            # The current code ends around `} else if (ctaUrl) { ... } \n}\n\n;`
            search_str = "  } else if (ctaUrl) {\n    // If not new and not explicitly requested, just append plain text URL gracefully if we want, or do nothing.\n    // We will do nothing to avoid spamming the CTA.\n  }\n}"
            if search_str in current_code:
                split_index = current_code.find(search_str) + len(search_str)
                fixed_code = current_code[:split_index] + "\n\n\n" + final_block
                node['parameters']['jsCode'] = fixed_code
                print('  Restored final outgoing payload and return statement.')
            else:
                print("Could not find insertion point!")

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
