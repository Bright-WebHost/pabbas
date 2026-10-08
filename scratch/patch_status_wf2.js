const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('C:\\brightmedia\\pabbas\\status_workflow.json', 'utf8'));

const buildMessageNode = wf.nodes.find(n => n.name === 'Build Message');
buildMessageNode.parameters.jsCode = `for (const item of $input.all()) {
  const order = item.json;
  let msg = "";
  let skip = false;
  let send_receipt = false;
  
  if (Array.isArray(order) && order.length > 0) {
    Object.assign(order, order[0]);
  }
  
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

    default:
      skip = true;
  }
  
  item.json.phone = order.customer_phone;
  item.json.message = msg;
  item.json.skip = skip;
  item.json.send_receipt = send_receipt;
}

return $input.all();`;

// The Send WhatsApp node should already be updated with image logic, but just in case
const sendNode = wf.nodes.find(n => n.name.includes('Send WhatsApp'));
sendNode.parameters.jsonBody = `={{ JSON.stringify((function() {
  const req = {
    from: "+919180348124",
    to: $json.phone
  };
  
  if ($json.send_receipt) {
    req.type = 'image';
    req.image = {
      link: 'https://staff.brightmedia.tech/api/receipt?order_number=' + $json.order_number,
      caption: $json.message
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
fs.writeFileSync('C:\\brightmedia\\pabbas\\scratch\\status_workflow_payload.json', JSON.stringify(payload, null, 2));

console.log('Saved payload');
