import urllib.request, json
import os
import requests

ycloud_key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('YCLOUD_API_KEY='): ycloud_key = line.split('=', 1)[1].strip()

# Dummy image content
with open('dummy.png', 'wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

files = {'file': ('dummy.png', open('dummy.png', 'rb'), 'image/png')}
headers = {'X-API-Key': ycloud_key}
res = requests.post('https://api.ycloud.com/v2/whatsapp/media/%2B919180348124/upload', headers=headers, files=files)

print(f"Status Code: {res.status_code}")
raw_res = res.text
print(f"Raw Response: {raw_res}")

media_id = raw_res.strip().split('\n')[0].strip()
print(f"Extracted Media ID: {media_id}")

if media_id:
    # Now trigger the n8n blast webhook
    webhook_url = "https://staff.brightmedia.tech/webhook/pabbas-blast"
    payload = {
        "filter": "all",
        "template_name": "weekend_promo",
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
        "phones": ["+919035960307"],
        "headers": {
            "authorization": "Bearer FAKE_TOKEN"
        }
    }
    print(f"Triggering webhook with media id: {media_id}")
    try:
        w_res = requests.post(webhook_url, json=payload, headers={'Authorization': 'Bearer FAKE_TOKEN'})
        print(f"Webhook status: {w_res.status_code}")
        print(f"Webhook output: {w_res.text}")
    except Exception as e:
        print(f"Webhook error: {e}")
