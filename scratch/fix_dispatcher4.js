const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', 'utf8');

content = content.replace('await supabase\n        (supabase as any).from("orders").update(payload)\n        .eq("id", orderId);', 'await (supabase as any).from("orders").update(payload).eq("id", orderId);');
content = content.replace('await supabase\r\n        (supabase as any).from("orders").update(payload)\r\n        .eq("id", orderId);', 'await (supabase as any).from("orders").update(payload).eq("id", orderId);');

fs.writeFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', content);
console.log('Fixed TS errors in DispatcherBoard finally');
