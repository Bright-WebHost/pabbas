import urllib.request, json, uuid
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

# Fix Parse Send Result to also carry forward phone, template_name from the input
parse_code = """
const sendResult = $input.item.json;
const filterData = $('Filter & Clean Phones').item.json;
return {
    json: {
        success: !!sendResult.id,
        messageId: sendResult.id || '',
        status: sendResult.status || 'unknown',
        phone: filterData.phone || '',
        template_name: filterData.template_name || '',
        error: sendResult.error ? JSON.stringify(sendResult.error) : ''
    }
};
"""

# Fix Log Blast to use correct field names from Parse Send Result
log_body = "={{ JSON.stringify({ run_id: $runId || $executionId, customer_phone: $json.phone, template_name: $json.template_name, status: $json.status, message_id: $json.messageId, error: $json.error || null }) }}"

for n in wf['nodes']:
    if n['name'] == 'Parse Send Result':
        n['parameters']['jsCode'] = parse_code
    if n['name'] == 'Log Blast':
        n['parameters']['jsonBody'] = log_body

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
