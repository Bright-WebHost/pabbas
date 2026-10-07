const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated5.json', 'utf8'));
const node = wf.nodes.find(n => n.name === 'Send Template');

node.parameters.jsonBody = "={{ JSON.stringify((function() {\n  const req = {\n    from: '+919180348124',\n    to: $json.phone,\n    type: 'template',\n    template: {\n      name: $json.template_name,\n      language: { code: $json.language }\n    }\n  };\n  \n  if ($json.components && $json.components.length > 0) {\n    req.template.components = $json.components;\n  } else if ($json.header_image) {\n    req.template.components = [{ type: 'header', parameters: [ { type: 'image', image: { link: $json.header_image } } ] }];\n  }\n  return req;\n})()) }}";

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated6.json', JSON.stringify(wf, null, 2));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};
fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_payload6.json', JSON.stringify(payload, null, 2));

console.log('Saved payload6');
