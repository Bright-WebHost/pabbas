import json
with open('scratch/live_ai_workflow_prod.json', 'r') as f:
    wf = json.load(f)

print('--- NODES ---')
for n in wf['nodes']:
    print(f\"{n['name']} : {n['type']}\")
