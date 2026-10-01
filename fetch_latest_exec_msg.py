import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions?limit=3&workflowId=k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())

for ex in data['data']:
    print(f"ID: {ex['id']} | Status: {ex.get('status','?')} | Finished: {ex.get('stoppedAt','?')}")

# Get the latest one with full data
exec_id = data['data'][0]['id']
req2 = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/executions/{exec_id}?includeData=true', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())
run_data = exec_data['data']['resultData']['runData']

if 'Send Template (TODO: verify YCloud payload)' in run_data:
    st = run_data['Send Template (TODO: verify YCloud payload)'][0]['data']['main'][0]
    print("\n=== Send Template output ===")
    for item in st:
        print(json.dumps(item['json'], indent=2))
        
        # Now fetch the YCloud status for this ID
        ycloud_key = None
        with open('.env.local', 'r') as f:
            for line in f:
                if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()
        
        msg_id = item['json'].get('id')
        if msg_id:
            req3 = urllib.request.Request(f'https://api.ycloud.com/v2/whatsapp/messages/{msg_id}', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
            try:
                res3 = urllib.request.urlopen(req3)
                ycloud_data = json.loads(res3.read().decode())
                print(f"\n=== YCloud API Status for {msg_id} ===")
                print(json.dumps(ycloud_data, indent=2))
            except Exception as e:
                print(f'\n=== YCloud API Status for {msg_id} (Error) ===')
                if hasattr(e, 'read'):
                    print(e.read().decode())
                else:
                    print(e)
