const fs = require('fs');
let w = JSON.parse(fs.readFileSync('n8n/workflows/Pabbas _ Blast Sender.json', 'utf-8'));
w.nodes = w.nodes.map(n => {
  if (n.name === 'Verify Staff') {
    n.parameters.headerParameters.parameters.find(p => p.name === 'Authorization').value = '={{ $json.headers.authorization }}';
    n.parameters.headerParameters.parameters.find(p => p.name === 'apikey').value = '={{ $env.SUPABASE_ANON_KEY }}';
  }
  return n;
});
fs.writeFileSync('n8n/workflows/Pabbas _ Blast Sender.json', JSON.stringify(w, null, 2));
console.log('Updated workflow Verify Staff JSON');
