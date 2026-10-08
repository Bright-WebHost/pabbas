/*
 * PABBAS - BUILD OUTBOUND MESSAGE
 * Updated to properly handle deterministic Welcome and Menu CTAs.
 */

const input = $input.first()?.json || {};
const inbound = $('Extract Inbound Message').first()?.json || {};
const route = $('Route Inbound Message').first()?.json || {};

const phone = String(input.customer_phone || input.phone || inbound.phone || route.customer_phone || '').trim();
const customerName = String(input.customer_name || input.name || inbound.customer_name || route.customer_name || '').trim();
const channelUserId = String(input.channel_user_id || inbound.channel_user_id || '').trim();

const ctaUrl = String(input.cta_url || '').trim();

const action = String(input.action || route.action || 'reply').toLowerCase();
const orderNumber = String(input.order_number || route.order_number || '').trim();
const result = String(input.result || '').trim();

let reply = String(input.reply || input.log_text || '').trim();

if (!reply && route.response) {
  reply = String(route.response.log_text || route.response.reply || '').trim();
}

if (!phone) {
  throw new Error('Build Outbound Message: customer phone is missing.');
}

let text = reply || 'Pabbas could not process that request.';
let interactive = null;

const firstName = customerName ? customerName.split(/\s+/)[0] : '';
const nameGreeting = firstName ? `Hey ${firstName}!` : `Hey there!`;

// ==================================================
// ACTION ROUTING
// ==================================================

if (action === 'create' || action === 'amend') {
  const items = Array.isArray(input.items_json) && input.items_json.length ? input.items_json : Array.isArray(input.items) ? input.items : [];
  const lines = items.map((item) => `${String(item?.name || 'Item').trim()} x${Number(item?.quantity || 1)}`).join('\n');
  const total = Number(input.total || 0);

  text = `${action === 'create' ? 'Order draft' : 'Order updated'}${orderNumber ? ` ${orderNumber}` : ''}:\n${lines || 'No items'}\nTotal: Rs ${total.toFixed(2)}\n\nPlease confirm your order.`;

  if (orderNumber) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `btn_confirm:${orderNumber}`, title: 'Confirm order' } },
          { type: 'reply', reply: { id: `btn_cancel:${orderNumber}`, title: 'Cancel order' } }
        ]
      }
    };
  }
}
else if (action === 'confirm') {
  text = `Order ${orderNumber || ''} confirmation result: ${result || 'processed'}.`.trim();
}
else if (action === 'cancel') {
  text = `Order ${orderNumber || ''} cancellation result: ${result || 'processed'}.`.trim();
}
else if (action === 'welcome') {
  text = `${nameGreeting} 👋 Welcome to Pabbas! 🍨\n\nWhat are you craving today? 😋\n\nI can help you order directly on WhatsApp, explore our menu, or answer any questions.\n\nChoose an option below 👇`;
  
  if (ctaUrl) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `btn_order`, title: '🛍️ Order on WhatsApp' } },
          { type: 'reply', reply: { id: `btn_menu`, title: '🍦 Explore Menu' } }, // Fallback reply button incase URL fails
          { type: 'reply', reply: { id: `btn_ask`, title: '💬 Ask Me Anything' } }
        ]
      }
    };
  }
}
else if (action === 'menu_cta') {
  text = `Sure! 🍦 You can explore the full menu and place an order securely here.`;
  if (ctaUrl) {
    interactive = {
      type: 'cta_url',
      body: { text },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: '🍦 Explore Menu',
          url: ctaUrl
        }
      }
    };
  }
}
else if (action === 'start_whatsapp_order') {
  text = `Absolutely! 😋 What would you like to order?`;
}
else if (action === 'start_questions') {
  text = `Of course! 😊 What would you like to know?`;
}
else if (action === 'reply') {
  text = `${reply}`;
}



// --------------------------------------------------
// FINAL OUTGOING PAYLOAD
// --------------------------------------------------

const outgoing = interactive
  ? {
      type: 'interactive',
      interactive
    }
  : {
      type: 'text',
      text: {
        body: text
      }
    };


// --------------------------------------------------
// RETURN
// --------------------------------------------------

return [
  {
    json: {

      customer_phone: phone,

      customer_name: customerName,

      channel_user_id: channelUserId,

      order_number: orderNumber || null,

      action,

      log_text: text,

      outgoing,

      ycloud_payload: {
        from: '+919180348124',
        to: phone,
        ...outgoing
      }
    }
  }
];