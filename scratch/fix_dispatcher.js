const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', 'utf8');
content = content.replace('../../orders/actions', '../orders/actions');
content = content.replace('rider_phone: rider.phone,', 'rider_phone: rider.whatsapp_number,');
content = content.replace('.update({', '.update({\n          rider_id: rider.id,\n          rider_name: rider.name,\n          rider_phone: rider.whatsapp_number,\n          status: "out_for_delivery",\n          updated_at: new Date().toISOString()\n        } as any)');
content = content.replace(/\\{\\n          rider_id: rider.id,[\\s\\S]*?updated_at: new Date\\(\\).toISOString\\(\\)\\n        \\}/g, '');

fs.writeFileSync('app/(dashboard)/dashboard/(main)/riders/DispatcherBoard.tsx', content);
console.log('Fixed DispatcherBoard TS errors');
