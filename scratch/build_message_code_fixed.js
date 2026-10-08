const webhookBody = $('Status Webhook').first().json.body || {};

for (const item of $input.all()) {
  const order = item.json;
  let msg = "";
  let skip = false;
  let send_receipt = false;
  
  if (Array.isArray(order) && order.length > 0) {
    Object.assign(order, order[0]);
  }
  
  // Restore webhook payload data because the "Update Status" node strips it
  const target_phone = webhookBody.rider_phone || order.rider_phone || order.customer_phone;
  const whatsapp_message_text = webhookBody.whatsapp_message_text || order.whatsapp_message_text;
  const interactive_btn = webhookBody.interactive_button || order.interactive_button;
  const cancel_reason = webhookBody.cancel_reason || order.cancel_reason;
  // Fallback to the webhook status if it was overridden or dropped
  const statusToUse = webhookBody.status || order.status;

  let message_type = interactive_btn ? 'interactive' : 'text';
  let interactive_button = interactive_btn || null;

  switch(statusToUse) {
    case 'preparing':
      msg = `Your Pabbas order #${order.order_number} is now being prepared. 👨🍳✨\nWe're getting everything ready for you!`;
      break;

    case 'ready_for_pickup':
      if (order.order_type === 'delivery') {
        msg = `Your Pabbas order #${order.order_number} is ready and waiting for our delivery partner to pick it up! 🛵\nIt will be out for delivery shortly. 😊`;
      } else {
        msg = `Your Pabbas order #${order.order_number} is ready for pickup! 🎉\nYou can collect it at the counter whenever you're ready. 😊`;
      }
      break;

    case 'out_for_delivery':
      msg = order.custom_message || `Your Pabbas order #${order.order_number} is on its way! 🛵💨\nIt won't be long now. Enjoy your treats! 🍨❤️`;
      break;

    case 'delivered':
      msg = `Your Pabbas order #${order.order_number} has been delivered. 🎉\nHere is your receipt! Thank you for choosing Pabbas. ❤️`;
      send_receipt = true;
      break;

    case 'completed':
      msg = `Your Pabbas order #${order.order_number} is now completed. 🎉\nHere is your receipt! Thank you for choosing Pabbas. ❤️`;
      send_receipt = true;
      break;

    case 'cancelled':
      const reason = cancel_reason ? `\nReason: ${cancel_reason}` : '';
      msg = `Your Pabbas order #${order.order_number} has been cancelled.${reason}`;
      break;
      
    case 'rider_assigned':
      msg = whatsapp_message_text || `You have a new delivery from Pabbas. Order: ${order.order_number}`;
      break;

    default:
      skip = true;
  }
  
  // Enforce + for YCloud WhatsApp
  let final_phone = target_phone;
  if (final_phone && !final_phone.startsWith('+')) {
    final_phone = '+' + final_phone;
  }

  item.json.phone = final_phone;
  item.json.message = msg;
  item.json.skip = skip;
  item.json.send_receipt = send_receipt;
  item.json.message_type = message_type;
  item.json.interactive_button = interactive_button;
}

return $input.all();
