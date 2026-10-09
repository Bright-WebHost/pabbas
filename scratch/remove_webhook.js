const fs = require('fs');
let content = fs.readFileSync('app/api/orders/route.ts', 'utf8');
content = content.replace(/\/\/ --- Notify customer via WhatsApp ---[\s\S]*?console\.error\('\[POST \/api\/orders\] Order notification failed \(non-blocking\):', notifyErr\?\.message \|\| 'Unknown error'\)\n      \}\n    \} catch \(notifyErr: any\) \{\n      console\.error\('\[POST \/api\/orders\] Global notification error:', notifyErr\?.message\)\n    \}/g, '// --- Notify customer via WhatsApp ---\n    // Moved to OrderManagerProvider.tsx (triggered when Admin accepts the order)\n');
fs.writeFileSync('app/api/orders/route.ts', content);
console.log('Removed notification from api/orders/route.ts');
