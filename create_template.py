import urllib.request, json, time
ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

# Fetch existing
req = urllib.request.Request('https://api.ycloud.com/v2/whatsapp/templates?name=weekend_promo', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
tpl = data['items'][0]

# Modify for new template
new_tpl = {
    "name": "weekend_promo_dynamic",
    "wabaId": tpl["wabaId"],
    "language": tpl["language"],
    "category": tpl["category"],
    "components": []
}

for comp in tpl['components']:
    if comp['type'] == 'BUTTONS':
        new_comp = {
            "type": "BUTTONS",
            "buttons": [
                {
                    "type": "URL",
                    "text": "Order Now",
                    "url": "https://pabbas-one.vercel.app/auth/whatsapp?token={{1}}",
                    "example": ["sample-token-12345"]
                }
            ]
        }
        new_tpl['components'].append(new_comp)
    else:
        new_tpl['components'].append(comp)

# Create template
req2 = urllib.request.Request('https://api.ycloud.com/v2/whatsapp/templates', data=json.dumps(new_tpl).encode(), headers={'X-API-Key': ycloud_key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='POST')
try:
    res2 = urllib.request.urlopen(req2)
    created_data = json.loads(res2.read().decode())
    print("Created template:", created_data['name'])
    print("Status:", created_data['status'])
    
    # Wait and check status
    print("Waiting for approval...")
    for _ in range(5):
        time.sleep(10)
        req3 = urllib.request.Request('https://api.ycloud.com/v2/whatsapp/templates?name=weekend_promo_dynamic', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
        res3 = urllib.request.urlopen(req3)
        check_data = json.loads(res3.read().decode())
        status = check_data['items'][0]['status']
        print(f"Current status: {status}")
        if status == 'APPROVED':
            print("\n=== Approved Template Details ===")
            print(json.dumps(check_data['items'][0], indent=2))
            break
except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode())
