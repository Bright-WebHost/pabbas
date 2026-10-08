const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\status_workflow.json', 'utf8'));

// Restore emojis and add rider/delivery logic
const buildMessageNode = wf.nodes.find(n => n.name === 'Build Message');
buildMessageNode.parameters.jsCode = `for (const item of $input.all()) {
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
      msg = order.custom_message || \`Your Pabbas order #\${order.order_number} is on its way! 🛵💨\\nIt won't be long now. Enjoy your treats! 🍨❤️\`;
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
      msg = order.whatsapp_message_text || \`You have a new delivery from Pabbas. Order: \${order.order_number}\`;
      target_phone = order.rider_phone;
      if (order.interactive_button) {
         message_type = 'interactive';
         interactive_button = order.interactive_button;
      }
      break;

    default:
      skip = true;
  }
  
  item.json.phone = target_phone;
  item.json.message = msg;
  item.json.skip = skip;
  item.json.send_receipt = send_receipt;
  item.json.message_type = message_type;
  item.json.interactive_button = interactive_button;
}

return $input.all();`;

// We also need to update the Send WhatsApp node to handle interactive messages if needed.
// YCloud interactive messages require a different payload.
// Actually, YCloud whatsapp interactive button for "Accept Order" is just a reply button.
const sendNode = wf.nodes.find(n => n.name.includes('Send WhatsApp'));
sendNode.parameters.jsonBody = `={{ JSON.stringify((function() {
  const req = {
    from: "+919180348124",
    to: $json.phone
  };
  
  if ($json.send_receipt) {
    req.type = 'image';
    req.image = {
      link: 'https://pabbas-one.vercel.app/api/receipt?order_number=' + $json.order_number,
      caption: $json.message
    };
  } else if ($json.message_type === 'interactive') {
    req.type = 'interactive';
    req.interactive = {
      type: 'button',
      body: {
        text: $json.message
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'accept_' + $json.order_number,
              title: $json.interactive_button
            }
          }
        ]
      }
    };
  } else {
    req.type = 'text';
    req.text = {
      body: $json.message
    };
  }
  
  return req;
})()) }}`;

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
