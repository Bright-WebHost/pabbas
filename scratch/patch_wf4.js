const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated3.json', 'utf8'));
const node = wf.nodes.find(n => n.name === 'Filter & Clean Phones');

node.parameters.jsCode = "const params = $('Extract Params').first().json;\nconst dbCustomers = $input.all().map(i => i.json) || [];\nconst explicitPhones = params.phones || [];\n\nlet targetPhones = [];\nif (explicitPhones.length > 0) {\n  targetPhones = explicitPhones;\n} else {\n  const now = Date.now();\n  targetPhones = dbCustomers.filter(c => {\n    if (params.filter === 'repeat' && c.total_orders < 2) return false;\n    if (params.filter === 'active_30') {\n      if (!c.last_order_date) return false;\n      const days = (now - new Date(c.last_order_date).getTime()) / (1000 * 60 * 60 * 24);\n      if (days > 30) return false;\n    }\n    return true;\n  }).map(c => c.phone);\n}\n\nconst unique = [...new Set(targetPhones.map(p => String(p).replace(/[^0-9]/g, '')).filter(Boolean))];\n\nreturn unique.map(p => ({\n  json: {\n    phone: p,\n    template_name: params.template_name,\n    language: params.language,\n    header_image: params.header_image,\n    ycloud_api_key: params.ycloud_api_key,\n    components: params.components\n  }\n}));";

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated4.json', JSON.stringify(wf, null, 2));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};
fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_payload4.json', JSON.stringify(payload, null, 2));

console.log('Saved payload4');
