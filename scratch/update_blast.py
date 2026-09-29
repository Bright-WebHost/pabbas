import json

def run():
    with open('n8n/workflows/Pabbas _ Blast Sender.json', 'r') as f:
        data = json.load(f)

    for node in data['nodes']:
        if node['name'] == 'Extract Params':
            node['parameters']['jsCode'] = '''const body = $input.first().json.body || {};
return [{
  json: {
    run_id: 'blast_' + Date.now(),
    filter: body.filter || 'all',
    template_name: body.template_name || '',
    language: body.language || 'en',
    header_image: body.header_image || '',
    phones: Array.isArray(body.phones) ? body.phones : []
  }
}];'''
        elif node['name'] == 'Filter & Clean Phones':
            node['parameters']['jsCode'] = '''const params = $('Extract Params').first().json;
const dbCustomers = $input.all().map(i => i.json) || [];
const explicitPhones = params.phones || [];

let targetPhones = [];
if (explicitPhones.length > 0) {
  // If specific phones were chosen, ignore the DB filter and just use them
  targetPhones = explicitPhones;
} else {
  // Otherwise use the DB customers matching the filter
  const now = Date.now();
  targetPhones = dbCustomers.filter(c => {
    if (params.filter === 'repeat' && c.total_orders < 2) return false;
    if (params.filter === 'active_30') {
      if (!c.last_order_date) return false;
      const days = (now - new Date(c.last_order_date).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 30) return false;
    }
    return true;
  }).map(c => c.phone);
}

// Clean and deduplicate
const unique = [...new Set(targetPhones.map(p => String(p).replace(/[^0-9]/g, '')).filter(Boolean))];

// Return one item per phone for the loop
return unique.map(p => ({
  json: {
    phone: p,
    template_name: params.template_name,
    language: params.language,
    header_image: params.header_image
  }
}));'''
        elif node['name'] == 'Send Template (TODO: verify YCloud payload)':
            node['name'] = 'Send Template'
            node['disabled'] = False
            node['parameters']['url'] = 'https://api.ycloud.com/v2/whatsapp/messages'
            node['parameters']['authentication'] = 'none' # Don't use n8n credentials feature for Ycloud, just header
            node['parameters']['headerParameters'] = {
              'parameters': [
                {'name': 'Content-Type', 'value': 'application/json'},
                {'name': 'X-API-Key', 'value': 'd5502caecd15e608b38bb515f76d5f35'}
              ]
            }
            node['parameters']['jsonBody'] = '''={{ JSON.stringify({
  to: $json.phone,
  type: 'template',
  template: {
    name: $json.template_name,
    language: { code: $json.language },
    components: $json.header_image ? [
      {
        type: 'header',
        parameters: [ { type: 'image', image: { link: $json.header_image } } ]
      }
    ] : []
  }
}) }}'''
        elif node['name'] == 'Parse Send Result':
            node['parameters']['jsCode'] = '''const req = $('Send Template').first().json || {};
const phone = $('Loop Customers').first().json.phone;

return [{
  json: {
    phone: phone,
    blast_status: req.error ? 'failed' : 'sent',
    blast_message_id: req.id || req.message_id || 'msg_' + Date.now(),
    blast_sent_at: new Date().toISOString(),
    blast_error: req.error ? JSON.stringify(req.error) : null
  }
}];'''

    # Update node connections for Send Template
    if 'Send Template (TODO: verify YCloud payload)' in data['connections']['Loop Customers']['main'][0][0]['node']:
        data['connections']['Loop Customers']['main'][0][0]['node'] = 'Send Template'
    data['connections']['Send Template'] = data['connections'].pop('Send Template (TODO: verify YCloud payload)')

    with open('n8n/workflows/Pabbas _ Blast Sender.json', 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == '__main__':
    run()
    print('Done updating workflow')
