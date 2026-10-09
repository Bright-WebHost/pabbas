const fs = require('fs');
let content = fs.readFileSync('verify_rbac.js', 'utf8');
content = content.replace("const fetch = require('node-fetch');", "");
fs.writeFileSync('verify_rbac.js', content);
