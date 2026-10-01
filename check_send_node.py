import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req2 = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions/10740?includeData=true', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())
run_data = exec_data['data']['resultData']['runData']

# Print ALL node names that ran
print("=== All nodes that ran ===")
for name in run_data.keys():
    print(f"  - {name}")

# Check if Send Template exists
for name in ['Send Template', 'Send Blast', 'Send Message', 'YCloud Send', 'HTTP Request']:
    if name in run_data:
        print(f"\n=== {name} output ===")
        print(json.dumps(run_data[name][0]['data'], indent=2))
