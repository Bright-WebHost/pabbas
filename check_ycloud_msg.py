import urllib.request, json
ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

# Check the message status
msg_id = '6abe002430e6d6039eeb45a2'
req = urllib.request.Request(f'https://api.ycloud.com/v2/whatsapp/messages/{msg_id}', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode())
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f'Error: {e}')
    if hasattr(e, 'read'):
        print(e.read().decode())
