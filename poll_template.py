import urllib.request, json, time
ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

print("Polling for approval...")
for _ in range(12):
    time.sleep(10)
    req = urllib.request.Request('https://api.ycloud.com/v2/whatsapp/templates?name=weekend_promo_dynamic', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
    res = urllib.request.urlopen(req)
    check_data = json.loads(res.read().decode())
    status = check_data['items'][0]['status']
    print(f"Current status: {status}")
    if status == 'APPROVED':
        print("\n=== Approved Template Details ===")
        print(json.dumps(check_data['items'][0], indent=2))
        break
