const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/OrderManagerProvider.tsx', 'utf8');

content = content.replace(
  'import { notifyStatusWebhook } from "@/lib/server/notify";',
  'import { notifyStatusWebhook, notifyOrderCreatedWebhook } from "@/lib/server/notify";'
);

const beforeWebhookLogic =       // Trigger Webhook
      try {
        let customMessage = undefined;;

const afterWebhookLogic =       // Trigger Webhook
      try {
        if (previousStatus === 'new' && nextStatus === 'preparing' && order.source !== 'pos') {
          // Send order confirmation message ONLY when admin accepts
          const itemsArr = Array.isArray(order.items_json) ? order.items_json : order.items || [];
          notifyOrderCreatedWebhook({
            order_number: order.order_number,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            order_type: order.order_type,
            items: itemsArr.map((item: any) => ({
              item_name: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
            total: Number(order.total)
          }).catch(console.error);
        }
        
        let customMessage = undefined;;

content = content.replace(beforeWebhookLogic, afterWebhookLogic);
fs.writeFileSync('app/(dashboard)/dashboard/OrderManagerProvider.tsx', content);
console.log('Added order accepted webhook logic');
