const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
console.log(env.match(/^[A-Z_]+/gm));
