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
    print('Processing WhatsApp AI Order Bridge for final logic...')
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    # 1. Update AI Agent Prompt
    with open('scratch/new_prompt.txt', 'r', encoding='utf-8') as f:
        new_prompt = f.read()

    for node in wf['nodes']:
        if node['name'] == 'Pabbas AI Order Agent':
            # LangChain Agent prompt is usually in parameters.options.systemMessage
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}
            node['parameters']['options']['systemMessage'] = new_prompt
            print('  Updated AI Agent Prompt')

        if node['name'] == 'Build Outbound Message':
            old_code = node['parameters']['jsCode']
            
            # The current node already has my previous patch (v4) or v3.
            # Let's replace the ENTIRE reply building logic safely.
            
            # Find the start of normal reply logic
            # "else if (action === 'reply') {"
            start_index = old_code.find("else if (action === 'reply') {")
            if start_index != -1:
                end_index = old_code.find("// --------------------------------------------------\\n// FINAL", start_index)
                
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
    // If not new and not explicitly requested, just append plain text URL gracefully if we want, or do nothing.
    // We will do nothing to avoid spamming the CTA.
  }
}

"""
                node['parameters']['jsCode'] = old_code[:start_index] + new_reply_logic + old_code[end_index:]
                print('  Updated Build Outbound Message with Conditional Interactive Buttons')

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated workflow!')

except Exception as e:
    print(f"Error: {e}")
