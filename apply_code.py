import urllib.request, json
key = None
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('N8N_API_KEY='): key = line.split('=', 1)[1].strip()

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', headers={'X-N8N-API-KEY': key, 'Accept': 'application/json'})
res = urllib.request.urlopen(req)
wf = json.loads(res.read().decode())

extract_params_code = "return $input.all();"

filter_code = """
const webhookData = $('Blast Webhook').item.json.body;
const targetPhones = webhookData.phones || [];
const customers = $input.all().map(item => item.json);

let filtered = customers;
if (targetPhones.length > 0) {
    filtered = customers.filter(c => targetPhones.includes(c.phone));
}

return filtered.map(c => {
    let cleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    
    return {
        json: {
            ...c,
            phone: cleanPhone,
            template_name: webhookData.template_name,
            language: webhookData.language || 'en',
            components: webhookData.components || [],
            ycloud_api_key: webhookData.ycloud_api_key
        }
    };
}).filter(c => c.json.phone); // Only keep items with a valid phone
"""

parse_code = """
const res = $input.item.json;
return {
    json: {
        success: !!res.id,
        messageId: res.id,
        status: res.status
    }
};
"""

for n in wf['nodes']:
    if n['name'] == 'Extract Params':
        n['parameters']['jsCode'] = extract_params_code
        n['parameters']['language'] = 'javaScript'
    elif n['name'] == 'Filter & Clean Phones':
        n['parameters']['jsCode'] = filter_code
        n['parameters']['language'] = 'javaScript'
    elif n['name'] == 'Parse Send Result':
        n['parameters']['jsCode'] = parse_code
        n['parameters']['language'] = 'javaScript'

payload = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': wf['settings']
}

req = urllib.request.Request('https://staff.brightmedia.tech/api/v1/workflows/k7mayj1bhUGCmz8x', data=json.dumps(payload).encode(), headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res = json.loads(urllib.request.urlopen(req).read().decode())
print('Success updating workflow:', res.get('id'))
