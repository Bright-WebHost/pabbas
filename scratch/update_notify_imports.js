const fs = require('fs');

function replaceImport(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/import \{ notifyStatusWebhook \} from ['"].*?orders\/actions['"];?/g, 'import { notifyStatusWebhook } from "@/lib/server/notify";');
  content = content.replace(/const \{ notifyStatusWebhook \} = await import\(['"].*?orders\/actions['"]\);?/g, 'const { notifyStatusWebhook } = await import("@/lib/server/notify");');
  fs.writeFileSync(path, content);
}

replaceImport('app/api/webhooks/rider/accept/route.ts');
replaceImport('app/api/orders/append/route.ts');
replaceImport('app/(dashboard)/dashboard/OrderManagerProvider.tsx');
replaceImport('app/(dashboard)/dashboard/(main)/tables/actions.ts');
replaceImport('app/(dashboard)/dashboard/(main)/pos/actions.ts');

let actionsContent = fs.readFileSync('app/(dashboard)/dashboard/(main)/orders/actions.ts', 'utf8');
actionsContent = actionsContent.replace(/export async function notifyStatusWebhook[\s\S]*?^}\r?\n?/m, '');
fs.writeFileSync('app/(dashboard)/dashboard/(main)/orders/actions.ts', actionsContent);

console.log('Done replacing imports and deleting function');
