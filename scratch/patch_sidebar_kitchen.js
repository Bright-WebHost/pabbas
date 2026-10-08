const fs = require('fs');
let file = fs.readFileSync('components/dashboard/Sidebar.tsx', 'utf8');

file = file.replace(
  "return ['orders', 'stats'].includes(link);",
  "return ['orders'].includes(link);"
);

fs.writeFileSync('components/dashboard/Sidebar.tsx', file);
console.log('Sidebar patched for kitchen stats restriction');
