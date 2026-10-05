const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('debug_workflow.json', 'utf-8'));

for (const n of w.nodes) {
  if (n.name === 'Build Message') {
    n.parameters.jsCode = `
const extractData = $('Extract Data').first().json || {};
for (const item of $input.all()) {
  const order = item.json;
  let msg = extractData.whatsapp_message_text || '';
  let skip = false;
  
  if (Array.isArray(order) && order.length > 0) {
    Object.assign(order, order[0]);
  }

  // Restore the target and rider info from Extract Data because Update Status destroyed it
  order.target = extractData.target || 'customer';
  order.rider_phone = extractData.rider_phone || null;
  order.cancel_reason = extractData.cancel_reason || order.cancel_reason || null;
  order.interactive_button = extractData.interactive_button || null;
  order.status = extractData.status || order.status;

  if (!msg) {
    switch(order.status) {
      case 'preparing':
        msg = \`Your Pabbas order #\${order.order_number} is now being prepared. 👨‍🍳✨\\nWe're getting everything ready for you!\`;
        break;
      case 'ready_for_pickup':
        msg = \`Your Pabbas order #\${order.order_number} is ready for pickup! 🎉\\nYou can collect it at the counter whenever you're ready. 😊\`;
        break;
      case 'out_for_delivery':
        msg = \`Your Pabbas order #\${order.order_number} is on its way! 🛵💨\\nIt won't be long now. Enjoy your treats! 🍨❤️\`;
        break;
      case 'delivered':
        msg = \`Your Pabbas order #\${order.order_number} has been delivered. 🎉\\nWe hope you enjoy your order! Thank you for choosing Pabbas. ❤️\`;
        break;
      case 'cancelled':
        const cancelReason = order.cancel_reason ? \`\\nReason: \${order.cancel_reason}\` : '';
        msg = \`Your Pabbas order #\${order.order_number} has been cancelled.\${cancelReason}\`;
        break;
      default:
        skip = true;
    }
  }
  
  if (order.target === 'rider') {
      item.json.phone = order.rider_phone;
      if (order.status === 'rider_assigned') skip = false;
  } else {
      item.json.phone = order.customer_phone;
  }

  item.json.message = msg;
  item.json.skip = skip;
  item.json.interactive_button = order.interactive_button;
  item.json.order_number = order.order_number;
}
return $input.all();
    `.trim();
  }
  
  if (n.name === 'Update Status') {
     n.parameters.jsonBody = `={{ JSON.stringify($json.status === 'cancelled' ? { status: $json.status, cancelled_by: 'staff:' + $json.staff, cancelled_at: new Date().toISOString(), cancel_reason: $json.cancel_reason } : ($json.status === 'rider_assigned' ? {} : { status: $json.status })) }}`;
  }
}

fetch('https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da', {
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: w.name,
    nodes: w.nodes,
    connections: w.connections,
    settings: w.settings
  })
}).then(async r => {
  if (!r.ok) {
    console.error(await r.text());
  } else {
    console.log('Fixed n8n variable loss in Build Message!');
  }
});
