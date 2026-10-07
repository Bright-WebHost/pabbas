const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow.json', 'utf8'));
const node = wf.nodes.find(n => n.name === 'Send Template');
console.log(JSON.stringify(node.parameters, null, 2));

// Update it
node.parameters.jsonBody = "={{ JSON.stringify({\n  to: $json.phone,\n  type: 'template',\n  template: {\n    name: $json.template_name,\n    language: { code: $json.language },\n    components: $json.components ? $json.components : ($json.header_image ? [{ type: 'header', parameters: [ { type: 'image', image: { link: $json.header_image } } ] }] : [])\n  }\n}) }}";

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated.json', JSON.stringify(wf, null, 2));
console.log('Saved to workflow_updated.json');
