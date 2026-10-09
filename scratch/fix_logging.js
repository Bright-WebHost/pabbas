const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/GlobalNewOrderPopup.tsx', 'utf8');

content = content.replace(
  'console.error(e);',
  'console.error("HandleAccept Error:", typeof e === "object" ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2) : e);'
);

fs.writeFileSync('app/(dashboard)/dashboard/GlobalNewOrderPopup.tsx', content);
console.log('Added better error logging to GlobalNewOrderPopup.tsx');
