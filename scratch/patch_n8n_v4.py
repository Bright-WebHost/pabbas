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
    print('Processing WhatsApp AI Order Bridge for Interactive CTA...')
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    for node in wf['nodes']:
        if node['name'] == 'Build Outbound Message':
            old_code = node['parameters']['jsCode']
            
            # Replace the plain text CTA logic with interactive buttons
            new_cta_logic = """
  if (ctaUrl) {
    text = `${reply}`;
    
    interactive = {
      type: 'button',
      body: {
        text: 'Ready to browse the menu or place an order?'
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
  }
"""
            
            # We locate the exact old CTA block to replace
            old_cta_logic = """  if (ctaUrl) {

    text =
      `${reply}\\n\\n` +
      `Ready to browse the menu or place an order? ` +
      `View it here: ${ctaUrl}`;
  }"""
            if old_cta_logic in old_code:
                node['parameters']['jsCode'] = old_code.replace(old_cta_logic, new_cta_logic)
                print('  Updated Build Outbound Message with Interactive Buttons')
            else:
                print('  Could not find old CTA logic to replace.')

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
