const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
console.log(JSON.stringify(data.connections['Confirm Order'], null, 2));
