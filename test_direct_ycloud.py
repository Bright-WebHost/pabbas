import urllib.request, json
ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

# Send template directly via YCloud API
media_id = "1379293230855412"
payload = {
    "from": "+919180348124",
    "to": "+919035960307",
    "type": "template",
    "template": {
        "name": "weekend_promo",
        "language": { "code": "en" },
        "components": [
            {
                "type": "header",
                "parameters": [
                    {
                        "type": "image",
                        "image": { "id": media_id }
                    }
                ]
            }
        ]
    }
}

req = urllib.request.Request('https://api.ycloud.com/v2/whatsapp/messages', data=json.dumps(payload).encode(), headers={'X-API-Key': ycloud_key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='POST')
try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    msg_id = data.get('id')
    print(f"Message ID: {msg_id}")
    
    import time
    time.sleep(5)
    
    req2 = urllib.request.Request(f'https://api.ycloud.com/v2/whatsapp/messages/{msg_id}', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
    res2 = urllib.request.urlopen(req2)
    status_data = json.loads(res2.read().decode())
    print(f"Status: {status_data.get('status')}")
    if 'errorMessage' in status_data:
        print(f"Error: {status_data['errorMessage']}")
except Exception as e:
    print(e)
    if hasattr(e, 'read'):
        print(e.read().decode())
