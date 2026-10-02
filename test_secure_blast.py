import urllib.request, json, time, requests
ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

# Create dummy image and upload it using proper endpoint
with open('dummy.png', 'wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

files = {'file': ('dummy.png', open('dummy.png', 'rb'), 'image/png')}
res = requests.post('https://api.ycloud.com/v2/whatsapp/media/%2B919180348124/upload', headers={'X-API-Key': ycloud_key}, files=files)
media_id = res.json().get('id')

webhook_url = "https://staff.brightmedia.tech/webhook/pabbas-blast"
payload = {
    "filter": "all",
    "template_name": "weekend_promo_dynamic",
    "language": "en",
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
    ],
    "ycloud_api_key": ycloud_key,
    "phones": ["919035960307"],
    "headers": {
        "authorization": "Bearer FAKE_TOKEN"
    }
}
print(f"Triggering webhook with proper media id: {media_id}")
w_res = requests.post(webhook_url, json=payload)
print(f"Webhook output: {w_res.text}")

time.sleep(10)

n8n_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): n8n_key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/executions?limit=1&workflowId=k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': n8n_key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
exec_id = data['data'][0]['id']

req2 = urllib.request.Request(f'https://staff.brightmedia.tech/api/v1/executions/{exec_id}?includeData=true', headers={'X-N8N-API-KEY': n8n_key, 'Accept': 'application/json'})
res2 = urllib.request.urlopen(req2)
exec_data = json.loads(res2.read().decode())
run_data = exec_data['data']['resultData']['runData']

if 'Send Template (TODO: verify YCloud payload)' in run_data:
    st = run_data['Send Template (TODO: verify YCloud payload)'][0]['data']['main'][0]
    msg_id = st[0]['json'].get('id')
    print(f"\nMessage ID sent: {msg_id}")
    if msg_id:
        req3 = urllib.request.Request(f'https://api.ycloud.com/v2/whatsapp/messages/{msg_id}', headers={'X-API-Key': ycloud_key, 'Accept': 'application/json'})
        res3 = urllib.request.urlopen(req3)
        ycloud_data = json.loads(res3.read().decode())
        print(f"\nFinal YCloud Status: {ycloud_data.get('status')}")
        if 'errorMessage' in ycloud_data:
            print(f"Error: {ycloud_data['errorMessage']}")
