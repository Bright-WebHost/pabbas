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
    print('Processing WhatsApp AI Order Bridge to restore return statement...')
    
    # Get original code from backup
    with open('scratch/backups/WhatsApp_AI_Order_Bridge_backup.json', 'r', encoding='utf-8') as f:
        backup = json.load(f)
    
    original_node = next(n for n in backup['nodes'] if n['name'] == 'Build Outbound Message')
    original_code = original_node['parameters']['jsCode']
    
    # We want everything AFTER the end of the `else if (action === 'reply') { ... }` block
    final_block_index = original_code.find("// --------------------------------------------------\\n// FINAL OUTGOING PAYLOAD")
    final_block = original_code[final_block_index:]

    # Now get current workflow
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    for node in wf['nodes']:
        if node['name'] == 'Build Outbound Message':
            current_code = node['parameters']['jsCode']
            
            # The current code ends around `} else if (ctaUrl) { ... } \n}\n\n;`
            # Let's clean it up and append the final block.
            
            # Find the end of the `reply` logic
            search_str = "  } else if (ctaUrl) {\n    // If not new and not explicitly requested, just append plain text URL gracefully if we want, or do nothing.\n    // We will do nothing to avoid spamming the CTA.\n  }\n}"
            if search_str in current_code:
                split_index = current_code.find(search_str) + len(search_str)
                fixed_code = current_code[:split_index] + "\\n\\n\\n" + final_block
                node['parameters']['jsCode'] = fixed_code
                print('  Restored final outgoing payload and return statement.')
            else:
                print('  Could not find where to insert the final block. Falling back to safe replacement.')
                # Fallback: Just take everything up to the `else if (action === 'reply')` from original,
                # insert our new logic, and insert the final block.
                start_index = original_code.find("else if (action === 'reply') {")
                
                new_reply_logic = """else if (action === 'reply') {
  
  const ctx = $('Retrieve Chat Context').first()?.json || {};
  const isNew = !ctx.history || ctx.history.length === 0;
  
  // Checking if they explicitly clicked our buttons
  const isMenuIntent = (String(inbound.content).toLowerCase().includes('btn_menu') || String(inbound.content).toLowerCase().includes('btn_order') || String(inbound.content).toLowerCase().includes('explore menu') || String(inbound.content).toLowerCase().includes('order now'));

  text = `${reply}`;

  if (ctaUrl && (isNew || isMenuIntent)) {
    interactive = {
      type: 'button',
      body: {
        text: `${reply}\\n\\nReady to browse the menu or place an order?`
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `btn_order`,
              title: '🛍️ Order Now'
            }
          },
          {
            type: 'reply',
            reply: {
              id: `btn_menu`,
              title: '🍦 Explore Menu'
            }
          },
          {
            type: 'reply',
            reply: {
              id: `btn_ask`,
              title: '💬 Ask Me Anything'
            }
          }
        ]
      }
    };
  } else if (ctaUrl) {
    // If not new and not explicitly requested, do nothing to avoid spamming CTA.
  }
}

"""
                node['parameters']['jsCode'] = original_code[:start_index] + new_reply_logic + final_block
                print('  Applied full safe replacement.')

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
