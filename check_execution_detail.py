import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req2 = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions/10740?includeData=true', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())
run_data = exec_data['data']['resultData']['runData']

# Check what Get Customers returned
print("=== Get Customers output ===")
gc = run_data['Get Customers'][0]['data']['main'][0]
for item in gc:
    print(json.dumps(item['json'], indent=2))

print("\n=== Filter & Clean Phones output ===")
fc = run_data['Filter & Clean Phones'][0]['data']['main'][0]
for item in fc:
    print(json.dumps(item['json'], indent=2))

print("\n=== Loop Customers output ===")
lc = run_data['Loop Customers'][0]['data']['main']
for branch in lc:
    if branch:
        for item in branch:
            print(json.dumps(item['json'], indent=2))

print("\n=== Done output ===")
done = run_data['Done'][0]['data']['main'][0]
for item in done:
    print(json.dumps(item['json'], indent=2))
