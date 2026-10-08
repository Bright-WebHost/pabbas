const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/workflow_current.json', 'utf8'));
const supabaseNodes = data.nodes.filter(n => JSON.stringify(n).includes('SUPABASE') || JSON.stringify(n).includes('supabase'));
console.log(supabaseNodes.map(n => n.name));
