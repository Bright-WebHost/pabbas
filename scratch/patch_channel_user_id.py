import json

with open('scratch/live_workflow_patched.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'Build AI Order Request':
        code = node['parameters']['jsCode']
        old_line = "return [{ json: { customer_phone: input.phone, customer_name: input.customer_name, message: input.content, context } }];"
        new_line = "return [{ json: { customer_phone: input.phone, customer_name: input.customer_name, channel_user_id: input.channel_user_id, message: input.content, context } }];"
        if old_line in code:
            node['parameters']['jsCode'] = code.replace(old_line, new_line)
            print('Replaced Build AI Order Request line successfully.')
        else:
            print('Line NOT found in Build AI Order Request!')
            
    if node['name'] == 'Validate Menu And Price':
        code = node['parameters']['jsCode']
        old_line = "const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, action: 'reply', reply: 'Tell me what you would like to order.', order_type: 'delivery', items: [], total: 0, order_number: null };"
        new_line = "const out = { customer_phone: source.customer_phone, customer_name: source.customer_name, channel_user_id: source.channel_user_id, action: 'reply', reply: 'Tell me what you would like to order.', order_type: 'delivery', items: [], total: 0, order_number: null };"
        if old_line in code:
            node['parameters']['jsCode'] = code.replace(old_line, new_line)
            print('Replaced Validate Menu And Price line successfully.')
        else:
            print('Line NOT found in Validate Menu And Price!')

with open('scratch/live_workflow_patched.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f)
