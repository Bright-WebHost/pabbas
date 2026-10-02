import urllib.request, json, time, os

key = None
with open('c:/brightmedia/pabbas/.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('YCLOUD_WEBHOOK_SECRET='): key = line.split('=', 1)[1].strip()

# Note: The actual n8n webhook requires YCloud signature if not mocked, but we can hit the test endpoint or just send directly.
# Wait, YCloud webhook requires `YCLOUD_WEBHOOK_SECRET` verification.
# n8n validates: const expected = $env.YCLOUD_WEBHOOK_SECRET
# It's easier to use the webhook-test endpoint in n8n, but since it's production, we just hit the real one.
# To bypass YCloud signature in python:
import hmac, hashlib

def send_msg(msg):
    url = "https://staff.brightmedia.tech/webhook/pabbas-whatsapp-inbound"
    payload = {
        "type": "message",
        "message": {
            "id": f"msg_{int(time.time()*1000)}",
            "from": "919035960307",
            "type": "text",
            "text": {"body": msg},
            "profile": {"name": "Maithri"}
        }
    }
    body = json.dumps(payload).encode()
    sig = hmac.new(key.encode(), body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(url, data=body, headers={
        'Content-Type': 'application/json',
        'X-YCloud-Signature': sig
    }, method='POST')
    res = urllib.request.urlopen(req)
    print(f"Sent: {msg}, Resp: {res.read().decode()}")

tests = [
    "create a new order and add 1 Golden Gadbad",
    "add 1 more Golden Gadbad",
    "what's in my cart",
    "remove 1 Golden Gadbad",
    "add 1 Golden Gadbad",
    "yes place the order",
    "I want some random unknown item",
    "Add 1 to the order that is currently preparing"
]

for t in tests:
    send_msg(t)
    time.sleep(15) # Wait for AI to process
