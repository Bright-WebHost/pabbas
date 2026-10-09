const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('scratch/status_notifier.json', 'utf8'));
const verifyStaff = wf.nodes.find(n => n.name === 'Verify Staff');
const nextConns = wf.connections['Verify Staff']?.main?.[0] || [];
console.log('Next nodes after Verify Staff:', nextConns.map(c => c.node));

const checkAuth = wf.nodes.find(n => n.name === 'Check Auth');
console.log(JSON.stringify(checkAuth, null, 2));
