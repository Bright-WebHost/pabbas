import urllib.request, json
import copy

key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

nodes = wf['nodes']
connections = wf['connections']

# Find nodes
filter_node = next(n for n in nodes if n['name'] == 'Filter & Clean Phones')
send_node = next(n for n in nodes if n['name'] == 'Send Template (TODO: verify YCloud payload)')

# Create Generate Token node
token_node = {
  "parameters": {
    "method": "GET",
    "url": "=https://pabbas-one.vercel.app/api/ai/tools/customer/lookup?phone={{ $json.phone }}&channel_user_id={{ $json.phone }}",
    "authentication": "none",
    "sendHeaders": True,
    "headerParameters": {
      "parameters": [
        {
          "name": "x-pabbas-ai-secret",
          "value": "LwnUc63SrvzJRE5hmSE4B7C1EmGoom1JlRTS/LTjqotl19jNZZScHT+X6tXaZqcs"
        }
      ]
    },
    "options": {}
  },
  "id": "generate-session-token-1234",
  "name": "Generate Session Token",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [
    send_node['position'][0] - 200,
    send_node['position'][1]
  ]
}

# Add token node to nodes
nodes.append(token_node)

# Update Send Template node to merge old properties and the token
send_node['parameters']['headerParameters']['parameters'][1]['value'] = "={{ $('Filter & Clean Phones').item.json.ycloud_api_key }}"

new_json_body = """={{ 
  JSON.stringify({ 
    from: '+919180348124', 
    to: $('Filter & Clean Phones').item.json.phone, 
    type: 'template', 
    template: { 
      name: $('Filter & Clean Phones').item.json.template_name, 
      language: { code: $('Filter & Clean Phones').item.json.language }, 
      components: [
        ...($('Filter & Clean Phones').item.json.components || []),
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: $json.cta_url ? $json.cta_url.split('token=')[1] : ''
            }
          ]
        }
      ] 
    } 
  }) 
}}"""
send_node['parameters']['jsonBody'] = new_json_body

# Update connections
# Filter -> Token
connections['Filter & Clean Phones'] = {
    'main': [
        [ { "node": "Generate Session Token", "type": "main", "index": 0 } ]
    ]
}
# Token -> Send
connections['Generate Session Token'] = {
    'main': [
        [ { "node": "Send Template (TODO: verify YCloud payload)", "type": "main", "index": 0 } ]
    ]
}

# Update workflow
payload = {
    'name': wf['name'],
    'nodes': nodes,
    'connections': connections,
    'settings': wf['settings']
}

req_put = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res_put = json.loads(urllib.request.urlopen(req_put).read().decode())
print('Success updating workflow:', res_put.get('id'))
