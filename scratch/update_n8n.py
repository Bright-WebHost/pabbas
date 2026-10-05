import json, os
from urllib.request import urlopen, Request

def run():
    # 1. Load keys
    dotenv = open('.env.local').read()
    key = [line.split('=', 1)[1].strip() for line in dotenv.split('\n') if line.startswith('N8N_API_KEY=')][0]

    # 2. Get workflow
    req = Request('https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da', headers={'X-N8N-API-KEY': key})
    w = json.loads(urlopen(req).read().decode())

    # 3. Modify Extract Data
    for n in w['nodes']:
        if n['name'] == 'Extract Data':
            n['parameters']['jsCode'] = '''const webhookData = $('Status Webhook').first().json.body || {};
for (const item of $input.all()) {
  item.json = {
    ...item.json,
    order_number: webhookData.order_number,
    status: webhookData.status,
    cancel_reason: webhookData.cancel_reason || null,
    target: webhookData.target || 'customer',
    rider_phone: webhookData.rider_phone || null,
    rider_name: webhookData.rider_name || null,
    whatsapp_message_text: webhookData.whatsapp_message_text || null,
    interactive_button: webhookData.interactive_button || null,
  };
}
return $input.all();'''

        if n['name'] == 'Build Message':
            n['parameters']['jsCode'] = '''for (const item of $input.all()) {
  const order = item.json;
  let msg = order.whatsapp_message_text || '';
  let skip = false;
  
  if (Array.isArray(order) && order.length > 0) {
    Object.assign(order, order[0]);
  }

  if (!msg) {
    switch(order.status) {
      case 'preparing':
        msg = `Your Pabbas order #${order.order_number} is now being prepared. 👨‍🍳✨\\nWe're getting everything ready for you!`;
        break;
      case 'ready_for_pickup':
        msg = `Your Pabbas order #${order.order_number} is ready for pickup! 🎉\\nYou can collect it at the counter whenever you're ready. 😊`;
        break;
      case 'out_for_delivery':
        msg = `Your Pabbas order #${order.order_number} is on its way! 🛵💨\\nIt won't be long now. Enjoy your treats! 🍨❤️`;
        break;
      case 'delivered':
        msg = `Your Pabbas order #${order.order_number} has been delivered. 🎉\\nWe hope you enjoy your order! Thank you for choosing Pabbas. ❤️`;
        break;
      case 'cancelled':
        const cancelReason = order.cancel_reason ? `\\nReason: ${order.cancel_reason}` : '';
        msg = `Your Pabbas order #${order.order_number} has been cancelled.${cancelReason}`;
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
}
return $input.all();'''

        if n['name'] == 'Send WhatsApp (TODO: verify YCloud payload)' or n['name'] == 'Send WhatsApp':
            n['name'] = 'Send WhatsApp'
            n['parameters']['jsonBody'] = '''={{ JSON.stringify({
  from: '+919180348124',
  to: String($json.phone).replace(/[^0-9]/g, ''),
  type: $json.interactive_button ? 'interactive' : 'text',
  ...($json.interactive_button ? {
    interactive: {
      type: 'button',
      body: { text: $json.message },
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
    }
  } : {
    text: { body: $json.message }
  })
}) }}'''

    # 4. Put workflow
    req2 = Request('https://staff.brightmedia.tech/api/v1/workflows/24IaEnLI3RCYU6da', 
                   data=json.dumps(w).encode(), 
                   headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json'},
                   method='PUT')
    urlopen(req2)
    print('Updated n8n status workflow!')

if __name__ == '__main__':
    run()
