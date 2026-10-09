const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('scratch/status_notifier.json', 'utf8'));
const isStaff = wf.nodes.find(n => n.name === 'Is Staff?');
console.log(JSON.stringify(isStaff.parameters.conditions, null, 2));
