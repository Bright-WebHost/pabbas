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
    print('Processing WhatsApp AI Order Bridge to update Outbound Message for Stage 4/5...')
    
    # Get current workflow
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    for node in wf['nodes']:
        if node['name'] == 'Build Outbound Message':
            current_code = node['parameters']['jsCode']
            
            # The current code has the `else if (action === 'reply') {` block ending with a replaced section.
            # We want to replace the whole `else if (action === 'reply') { ... }` block but leave the FINAL OUTGOING PAYLOAD alone.
            start_index = current_code.find("else if (action === 'reply') {")
            end_index = current_code.find("// --------------------------------------------------\n// FINAL OUTGOING PAYLOAD")
            
            if start_index != -1 and end_index != -1:
                new_reply_logic = """else if (action === 'reply') {
  
  const ctx = $('Retrieve Chat Context').first()?.json || {};
  const isNew = !ctx.history || ctx.history.length === 0;
  
  const userMsg = String(inbound.content).toLowerCase();
  const isMenuIntent = userMsg.includes('btn_menu') || userMsg.includes('btn_order') || 
                       userMsg.includes('explore menu') || userMsg.includes('order now') || 
                       userMsg.includes('menu') || userMsg.includes('what do you have');

  text = `${reply}`;

  if (ctaUrl && isNew) {
    // NEW CONVERSATION: Full Welcome + 3 Buttons
    interactive = {
      type: 'button',
      body: {
        text: `${reply}` // the AI provided the welcome
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: `btn_order`, title: '🛍️ Order Now' }
          },
          {
            type: 'reply',
            reply: { id: `btn_menu`, title: '🍦 Explore Menu' }
          },
          {
            type: 'reply',
            reply: { id: `btn_ask`, title: '💬 Ask Me Anything' }
          }
        ]
      }
    };
  } else if (ctaUrl && isMenuIntent) {
    // EXPLICIT MENU REQUEST IN EXISTING CONVO: CTA Button
    interactive = {
      type: 'button',
      body: {
        text: `${reply}`
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: `btn_menu`, title: '🍦 Explore Menu' }
          }
        ]
      }
    };
  } else {
    // Normal conversation, just send plain text without URL!
    // We intentionally do NOT append ctaUrl as plain text to avoid spam.
  }
}

"""
                node['parameters']['jsCode'] = current_code[:start_index] + new_reply_logic + current_code[end_index:]
                print('  Updated Build Outbound Message with robust intent logic.')
            else:
                print("Could not find insertion points!")

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
