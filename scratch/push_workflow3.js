const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\status_workflow.json', 'utf8'));

// Find Build Message node
const buildMsgNode = wf.nodes.find(n => n.name === 'Build Message');

buildMsgNode.parameters.jsCode = `const webhookBody = $('Status Webhook').first().json.body || {};

for (const item of $input.all()) {
  const order = item.json;
  let msg = "";
  let skip = false;
  let send_receipt = false;
  let target_phone = order.customer_phone;
  let message_type = 'text'; // Default to text, but could be 'interactive'
  let interactive_button = null;
  
  if (Array.isArray(order) && order.length > 0) {
    Object.assign(order, order[0]);
  }
  
  switch(order.status) {
    case 'preparing':
      msg = \`Your Pabbas order #\${order.order_number} is now being prepared. 👨‍🍳✨\\nWe're getting everything ready for you!\`;
      break;

    case 'ready_for_pickup':
      if (order.order_type === 'delivery') {
        msg = \`Your Pabbas order #\${order.order_number} is ready and waiting for our delivery partner to pick it up! 🛵\\nIt will be out for delivery shortly. 😊\`;
      } else {
        msg = \`Your Pabbas order #\${order.order_number} is ready for pickup! 🎉\\nYou can collect it at the counter whenever you're ready. 😊\`;
      }
      break;

    case 'out_for_delivery':
      msg = webhookBody.custom_message || order.custom_message || \`Your Pabbas order #\${order.order_number} is on its way! 🛵💨\\nIt won't be long now. Enjoy your treats! 🍨❤️\`;
      break;

    case 'delivered':
      msg = \`Your Pabbas order #\${order.order_number} has been delivered. 🎉\\nHere is your receipt! Thank you for choosing Pabbas. ❤️\`;
      send_receipt = true;
      break;

    case 'completed':
      msg = \`Your Pabbas order #\${order.order_number} is now completed. 🎉\\nHere is your receipt! Thank you for choosing Pabbas. ❤️\`;
      send_receipt = true;
      break;

    case 'cancelled':
      const cancelReason = order.cancel_reason
        ? \`\\nReason: \${order.cancel_reason}\`
        : '';

      msg = \`Your Pabbas order #\${order.order_number} has been cancelled.\${cancelReason}\`;
      break;
      
    case 'rider_assigned':
      msg = webhookBody.whatsapp_message_text || order.whatsapp_message_text || \`You have a new delivery from Pabbas. Order: \${order.order_number}\`;
      target_phone = order.rider_phone || webhookBody.rider_phone;
      if (webhookBody.interactive_button || order.interactive_button) {
         message_type = 'interactive';
         interactive_button = webhookBody.interactive_button || order.interactive_button;
      }
      break;

    default:
      skip = true;
  }
  
  // Enforce + for YCloud WhatsApp
  if (target_phone && !target_phone.startsWith('+')) {
    target_phone = '+' + target_phone;
  }

  item.json.phone = target_phone;
  item.json.message = msg;
  item.json.skip = skip;
  item.json.send_receipt = send_receipt;
  item.json.message_type = message_type;
  item.json.interactive_button = interactive_button;
}

return $input.all();`;


fs.writeFileSync('C:\\brightmedia\\pabbas\\status_workflow.json', JSON.stringify(wf, null, 2));

const payload = {
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  name: wf.name
};

async function pushWorkflow() {
  const res = await fetch("https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da", {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  console.log("Status:", res.status);
}

pushWorkflow();
