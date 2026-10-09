const fs = require('fs');

// Fix permissions.ts
let p = fs.readFileSync('lib/auth/permissions.ts', 'utf8');
p = p.replace(/"\/dashboard"/g, '"/dashboard/orders"');
fs.writeFileSync('lib/auth/permissions.ts', p);

// Fix pos/actions.ts
let pos = fs.readFileSync('app/(dashboard)/dashboard/(main)/pos/actions.ts', 'utf8');
pos = pos.replace(/import \{ notifyStatusWebhook \} from "\.\.\/orders\/actions";/, 'import { notifyStatusWebhook } from "@/lib/server/notify";');
fs.writeFileSync('app/(dashboard)/dashboard/(main)/pos/actions.ts', pos);

// Fix tables/actions.ts
let tables = fs.readFileSync('app/(dashboard)/dashboard/(main)/tables/actions.ts', 'utf8');
tables = tables.replace(/const \{ notifyStatusWebhook \} = await import\(['"].*?orders\/actions['"]\);/g, 'const { notifyStatusWebhook } = await import("@/lib/server/notify");');
fs.writeFileSync('app/(dashboard)/dashboard/(main)/tables/actions.ts', tables);

// Fix staff.ts type
let staff = fs.readFileSync('lib/auth/staff.ts', 'utf8');
staff = staff.replace(/const \{ data, error \} = await supabase.rpc\("staff_check"\);/, 'const { data, error } = await supabase.rpc<any, any>("staff_check");');
fs.writeFileSync('lib/auth/staff.ts', staff);

console.log('Fixed typescript issues');
