import json
import urllib.request
import uuid

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

def create_tool_node(name, endpoint, description, index_pos):
    return {
        "parameters": {
            "method": "POST",
            "url": f"https://pabbas-one.vercel.app{endpoint}",
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {
                        "name": "x-pabbas-ai-secret",
                        "value": "b5j8X9q2M4v7P1n6W3c8R5y2K9h4T7m1"
                    }
                ]
            },
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": "={\\n  \"customer_id\": \"{{ $('Extract Inbound Message').first().json.customer_id }}\",\\n  \"channel_user_id\": \"{{ $('Extract Inbound Message').first().json.channel_user_id }}\",\\n  ...$input.all()[0].json\\n}",
            "name": name,
            "description": description
        },
        "id": str(uuid.uuid4()),
        "name": name,
        "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
        "typeVersion": 1,
        "position": [
            300 + index_pos * 200,
            1200
        ]
    }

try:
    print('Processing WhatsApp AI Order Bridge to add tools...')
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    # Check if tools already exist
    existing_tools = [n['name'] for n in wf['nodes'] if n['type'] == '@n8n/n8n-nodes-langchain.toolHttpRequest']
    
    new_tools = []
    
    if "Pabbas Business Info" not in existing_tools:
        new_tools.append(create_tool_node(
            "Pabbas Business Info", 
            "/api/ai/tools/info", 
            "Use this to answer questions about the restaurant address, delivery areas, delivery time, charges, opening hours, or payment methods.",
            0
        ))
        
    if "Pabbas Cart" not in existing_tools:
        new_tools.append(create_tool_node(
            "Pabbas Cart", 
            "/api/ai/tools/cart", 
            "Use this to add items, remove items, or view the current shopping cart. Provide action (add, remove, view), menu_item_id, and quantity.",
            1
        ))
        
    if "Pabbas Order Status" not in existing_tools:
        new_tools.append(create_tool_node(
            "Pabbas Order Status", 
            "/api/ai/tools/order_status", 
            "Use this to check the status of the customer's most recent order.",
            2
        ))
        
    if "Pabbas Order Update" not in existing_tools:
        new_tools.append(create_tool_node(
            "Pabbas Order Update", 
            "/api/ai/tools/order_update", 
            "Use this to add or remove items from an active, unlocked order. Requires order_id, action, menu_item_id, quantity.",
            3
        ))
        
    for tool in new_tools:
        wf['nodes'].append(tool)
        
        # Connect tool to the Agent
        if tool['name'] not in wf['connections']:
            wf['connections'][tool['name']] = {}
        if "tool" not in wf['connections'][tool['name']]:
            wf['connections'][tool['name']]["tool"] = [[]]
            
        wf['connections'][tool['name']]["tool"][0].append({
            "node": "Pabbas AI Order Agent",
            "type": "tool",
            "index": 0
        })

    if new_tools:
        update_workflow('BfhcbxFiXa4Vga51', wf)
        print(f'Successfully added {len(new_tools)} tools to the workflow!')
    else:
        print('Tools already exist.')

except Exception as e:
    print(f"Error: {e}")
