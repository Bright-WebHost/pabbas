const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
console.log(JSON.stringify(data.connections['Resolve Customer Identity for CTA'], null, 2));
