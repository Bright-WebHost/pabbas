const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', 'utf8');

content = content.replace('.from("orders")\\n        .update(payload as any)', '(supabase as any).from("orders").update(payload)');
content = content.replace('.from("orders")\n        .update(payload as any)', '(supabase as any).from("orders").update(payload)'); // Handle newline differences

fs.writeFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', content);
console.log('Fixed TS errors in DispatcherBoard third try');
