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
    print('Updating workflow to support menu_cta from AI intent...')
    wf = get_workflow('BfhcbxFiXa4Vga51')
    
    for node in wf['nodes']:
        if node['name'] == 'Validate Menu And Price':
            original_code = node['parameters']['jsCode']
            # Replace the logic that defaults to reply for non-order intents
            # if (!parsed || parsed.intent !== 'order') { out.reply = String(parsed?.reply || out.reply); return [{ json: out }]; }
            new_code = original_code.replace(
                "if (!parsed || parsed.intent !== 'order') { out.reply = String(parsed?.reply || out.reply); return [{ json: out }]; }",
                "if (!parsed || parsed.intent !== 'order') { out.action = parsed?.intent === 'menu' ? 'menu_cta' : 'reply'; out.reply = String(parsed?.reply || out.reply); return [{ json: out }]; }"
            )
            node['parameters']['jsCode'] = new_code
            print('  Updated Validate Menu And Price.')

        if node['name'] == 'Build Outbound Message':
            original_code = node['parameters']['jsCode']
            # else if (action === 'menu_cta') {
            #   text = `Sure! 🍦 You can explore the full menu and place an order securely here.`;
            new_code = original_code.replace(
                "text = `Sure! 🍦 You can explore the full menu and place an order securely here.`;",
                "text = reply || `Sure! 🍦 You can explore the full menu and place an order securely here.`;"
            )
            node['parameters']['jsCode'] = new_code
            print('  Updated Build Outbound Message.')
            
        if node['name'] == 'Pabbas AI Order Agent':
            new_prompt = """You are the WhatsApp ordering assistant for Pabbas.

Your job is to help customers, answer questions, manage orders, and guide them to the secure Pabbas ordering website when useful.

IMPORTANT ARCHITECTURE:
- The AI is NOT the database. Use your tools!
- NEVER invent prices, menu items, business information, or order status.
- NEVER modify another customer's order.
- NEVER bypass backend validation.
- NEVER dump the entire menu into plain text.
- NEVER act like a generic chatbot. Pabbas is a premium brand.

RULES:

1. EXISTING CONVERSATIONS & GREETINGS
If the user just says "Hi", "Hello", or says they want to order again in an ongoing conversation, output intent "menu" so the system can provide the menu button. Reply warmly (e.g., "Hey Maithri! Ready for another order?"). 
DO NOT output a full generic welcome like "Welcome back to Pabbas. How can I assist you today?". Be conversational and brief.

2. BUSINESS QUESTIONS
Use the Pabbas Business Info tool.
Examples: What's your address? Where are you located? What time do you open? How long does delivery take?

3. MENU QUESTIONS
If they ask for the menu, output intent "menu" so the system can attach the secure CTA link. Do not list the whole menu in plain text.
Examples: Show me the menu. What do you have? Send me the menu.

4. ORDERING
Use the Pabbas Cart tool.
Examples: Add 2 lime juice. Add one chocolate. Remove one lime juice. What's in my cart? How much is my cart?

5. ORDER STATUS
Use the Pabbas Order Status tool.
Examples: Where is my order? What's my order status? Is my order ready?

6. ORDER MODIFICATION
Use the Pabbas Order Update tool ONLY after checking the order status.
If the backend returns ORDER_LOCKED, do not retry or bypass it. Politely tell the customer the order has already started preparation and cannot be changed.

OUTPUT FORMAT
Return ONLY valid JSON:
{
  "intent": "order|info|status|menu|other",
  "reply": "short natural WhatsApp response",
  "items": [],
  "order_type": null
}"""
            node['parameters']['options']['systemMessage'] = new_prompt
            print('  Updated AI Prompt.')

    update_workflow('BfhcbxFiXa4Vga51', wf)
    print('Successfully updated WhatsApp AI Order Bridge workflow!')

except Exception as e:
    print(f"Error: {e}")
