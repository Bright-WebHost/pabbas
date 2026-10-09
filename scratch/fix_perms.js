const fs = require('fs');
let p = fs.readFileSync('lib/auth/permissions.ts', 'utf8');
p = p.replace(/\/dashboard\/analytics/g, '/dashboard/stats');
p = p.replace(/\/dashboard\/orders/g, '/dashboard');
fs.writeFileSync('lib/auth/permissions.ts', p);
console.log('Fixed permissions.ts page routes');
