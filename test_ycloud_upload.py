import urllib.request, json
ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

# Check the weekend_promo template to understand what header it expects
req = urllib.request.Request('https://api.ycloud.com/v2/whatsapp/templates?name=weekend_promo', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
for t in data.get('items', []):
    print(f"Template: {t['name']} | Status: {t['status']} | Language: {t['language']}")
    for c in t.get('components', []):
        print(f"  Component: {c['type']} | Format: {c.get('format', 'N/A')}")
        if c.get('example'):
            print(f"  Example: {c['example']}")
