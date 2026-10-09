const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', 'utf8');

content = content.replace('import { updateOrderStatus } from "../orders/actions";\n', '');
content = content.replace('.update(payload)', '.update(payload as any)');

fs.writeFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', content);
console.log('Fixed TS errors in DispatcherBoard again');
