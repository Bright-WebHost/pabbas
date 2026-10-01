import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req2 = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions/10743?includeData=true', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())
run_data = exec_data['data']['resultData']['runData']

print("=== All nodes that ran ===")
for name in run_data.keys():
    runs = run_data[name]
    status = runs[0].get('executionStatus', '?')
    num_runs = len(runs)
    print(f"  {name}: {status} (ran {num_runs} time(s))")

print("\n=== Loop Customers detail ===")
lc = run_data['Loop Customers'][0]
print(f"  executionStatus: {lc.get('executionStatus')}")
print(f"  number of output branches: {len(lc['data']['main'])}")
for i, branch in enumerate(lc['data']['main']):
    if branch:
        print(f"  Branch {i}: {len(branch)} items")
        for item in branch:
            print(f"    keys: {list(item['json'].keys())}")
    else:
        print(f"  Branch {i}: empty/null")
