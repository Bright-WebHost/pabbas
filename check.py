import json
with open('scratch/live_ai_workflow_prod.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)
for n in wf['nodes']:
    if 'credentials' in n:
        print(n['name'], n['credentials'])
