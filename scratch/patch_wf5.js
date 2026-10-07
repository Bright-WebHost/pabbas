const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated4.json', 'utf8'));

// Swap the connections for Loop Customers
const loopConnections = wf.connections['Loop Customers']['main'];
const newLoopConnections = [
  loopConnections[1], // Done
  loopConnections[0]  // Send Template
];
wf.connections['Loop Customers']['main'] = newLoopConnections;

fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_updated5.json', JSON.stringify(wf, null, 2));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};
fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\workflow_payload5.json', JSON.stringify(payload, null, 2));

console.log('Saved payload5');
