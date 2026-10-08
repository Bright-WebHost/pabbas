import json
with open('scratch/live_workflow_patched.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'Validate Menu And Price':
        code = node['parameters']['jsCode']
        old_line = "if (!parsed || parsed.intent !== 'order') { out.reply = String(parsed?.reply || out.reply); return [{ json: out }]; }"
        new_line = "if (!parsed || parsed.intent !== 'order') { out.action = parsed?.intent === 'menu' ? 'menu_cta' : 'reply'; out.reply = String(parsed?.reply || out.reply); return [{ json: out }]; }"
        if old_line in code:
            node['parameters']['jsCode'] = code.replace(old_line, new_line)
            print('Replaced Validate Menu And Price line successfully.')
        else:
            print('Line NOT found in Validate Menu And Price!')
            
    if node['name'] == 'Build Outbound Message':
        code = node['parameters']['jsCode']
        old_line = "text = `Sure!  You can explore the full menu and place an order securely here.`;"
        new_line = "text = reply || `Sure! 🍦 You can explore the full menu and place an order securely here.`;"
        if old_line in code:
            node['parameters']['jsCode'] = code.replace(old_line, new_line)
            print('Replaced Build Outbound Message line successfully.')
        else:
            # Let's try to just insert it by finding the menu_cta block
            lines = code.split('\n')
            for i, line in enumerate(lines):
                if "else if (action === 'menu_cta')" in line:
                    # Next line should be the text assignment
                    if "text =" in lines[i+1]:
                        lines[i+1] = "  text = reply || `Sure! 🍦 You can explore the full menu and place an order securely here.`;"
                        node['parameters']['jsCode'] = '\n'.join(lines)
                        print('Replaced Build Outbound Message line via index successfully.')
                        break

with open('scratch/live_workflow_patched.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f)
