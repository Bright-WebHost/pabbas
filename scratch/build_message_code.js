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
      msg = `Your Pabbas order #${order.order_number} is now being prepared. 👨‍🍳✨\nWe're getting everything ready for you!`;
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
      const cancelReason = order.cancel_reason
        ? `\nReason: ${order.cancel_reason}`
        : '';
      msg = `Your Pabbas order #${order.order_number} has been cancelled.${cancelReason}`;
      break;
      
    case 'rider_assigned':
      msg = order.whatsapp_message_text || `You have a new delivery from Pabbas. Order: ${order.order_number}`;
      target_phone = order.rider_phone;
      if (order.interactive_button) {
         message_type = 'interactive';
         interactive_button = order.interactive_button;
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

return $input.all();
