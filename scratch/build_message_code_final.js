const webhookBody = $('Status Webhook').first().json.body || {};

for (const item of $input.all()) {
  const order = item.json;
  let msg = "";
  let skip = false;
  let send_receipt = false;
  
  if (Array.isArray(order) && order.length > 0) {
    Object.assign(order, order[0]);
  }
  
  // Restore all critical data from the webhook because "Update Status" strips it or returns empty for rider_assigned
  const order_number = webhookBody.order_number || order.order_number;
  const target_phone = webhookBody.rider_phone || order.rider_phone || order.customer_phone;
  const whatsapp_message_text = webhookBody.whatsapp_message_text || order.whatsapp_message_text;
  const interactive_btn = webhookBody.interactive_button || order.interactive_button;
  const cancel_reason = webhookBody.cancel_reason || order.cancel_reason;
  const statusToUse = webhookBody.status || order.status;

  let message_type = interactive_btn ? 'interactive' : 'text';
  let interactive_button = interactive_btn || null;

  switch(statusToUse) {
    case 'preparing':
      msg = `Your Pabbas order #${order_number} is now being prepared. 👨🍳✨\nWe're getting everything ready for you!`;
      break;

    case 'ready_for_pickup':
      if (order.order_type === 'delivery' || webhookBody.order_type === 'delivery') {
        msg = `Your Pabbas order #${order_number} is ready and waiting for our delivery partner to pick it up! 🛵\nIt will be out for delivery shortly. 😊`;
      } else {
        msg = `Your Pabbas order #${order_number} is ready for pickup! 🎉\nYou can collect it at the counter whenever you're ready. 😊`;
      }
      break;

    case 'out_for_delivery':
      msg = webhookBody.custom_message || order.custom_message || `Your Pabbas order #${order_number} is on its way! 🛵💨\nIt won't be long now. Enjoy your treats! 🍨❤️`;
      break;

    case 'delivered':
      msg = `Your Pabbas order #${order_number} has been delivered. 🎉\nHere is your receipt! Thank you for choosing Pabbas. ❤️`;
      send_receipt = true;
      break;

    case 'completed':
      msg = `Your Pabbas order #${order_number} is now completed. 🎉\nHere is your receipt! Thank you for choosing Pabbas. ❤️`;
      send_receipt = true;
      break;

    case 'cancelled':
      const reason = cancel_reason ? `\nReason: ${cancel_reason}` : '';
      msg = `Your Pabbas order #${order_number} has been cancelled.${reason}`;
      break;
      
    case 'rider_assigned':
      msg = whatsapp_message_text || `You have a new delivery from Pabbas. Order: ${order_number}`;
      break;

    default:
      skip = true;
  }
  
  let final_phone = target_phone;
  if (final_phone && !final_phone.startsWith('+')) {
    final_phone = '+' + final_phone;
  }

  // Update item.json with only what we need to send
  item.json = {
     order_number: order_number,
     phone: final_phone,
     message: msg,
     skip: skip,
     send_receipt: send_receipt,
     message_type: message_type,
     interactive_button: interactive_button
  };
}

return $input.all();
