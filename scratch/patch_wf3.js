const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated2.json', 'utf8'));
const node = wf.nodes.find(n => n.name === 'Extract Params');

node.parameters.jsCode = "const body = $('Blast Webhook').first().json.body || {};\nreturn [{\n  json: {\n    run_id: 'blast_' + Date.now(),\n    filter: body.filter || 'all',\n    template_name: body.template_name || '',\n    language: body.language || 'en',\n    header_image: body.header_image || '',\n    ycloud_api_key: body.ycloud_api_key || '',\n    phones: Array.isArray(body.phones) ? body.phones : [],\n    components: Array.isArray(body.components) ? body.components : []\n  }\n}];";

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated3.json', JSON.stringify(wf, null, 2));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};
fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_payload3.json', JSON.stringify(payload, null, 2));

console.log('Saved payload3');
