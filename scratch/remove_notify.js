const fs = require('fs');

let actionsContent = fs.readFileSync('app/(dashboard)/dashboard/(main)/orders/actions.ts', 'utf8');
actionsContent = actionsContent.replace(/export async function notifyStatusWebhook[\s\S]*?^}\r?\n?/m, '');
fs.writeFileSync('app/(dashboard)/dashboard/(main)/orders/actions.ts', actionsContent);

console.log('Removed notifyStatusWebhook');
