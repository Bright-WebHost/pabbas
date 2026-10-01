/*
 * PABBAS - BUILD OUTBOUND MESSAGE
 *
 * This node can be reached from multiple branches.
 * Therefore:
 * - Use the current input when available.
 * - Always recover the original WhatsApp phone from
 *   Extract Inbound Message, which is upstream of every route.
 * - Do not depend on Build Routed Response being executed.
 * - Do not depend on Resolve Secure Customer Session being executed.
 */

const input = $input.first()?.json || {};


// --------------------------------------------------
// SAFE ACCESS TO ALWAYS-AVAILABLE INBOUND MESSAGE
// --------------------------------------------------

const inbound = $('Extract Inbound Message').first()?.json || {};
const route = $('Route Inbound Message').first()?.json || {};


// --------------------------------------------------
// CUSTOMER IDENTITY
// --------------------------------------------------

const phone = String(
  input.customer_phone ||
  input.phone ||
  inbound.phone ||
  route.customer_phone ||
  ''
).trim();

const customerName = String(
  input.customer_name ||
  input.name ||
  inbound.customer_name ||
  route.customer_name ||
  ''
).trim();

const channelUserId = String(
  input.channel_user_id ||
  inbound.channel_user_id ||
  ''
).trim();


// --------------------------------------------------
// SECURE CTA
// --------------------------------------------------

const ctaUrl = String(
  input.cta_url ||
  ''
).trim();


// --------------------------------------------------
// RESPONSE DATA
// --------------------------------------------------

const action = String(
  input.action ||
  route.action ||
  'reply'
).toLowerCase();

const orderNumber = String(
  input.order_number ||
  route.order_number ||
  ''
).trim();

const result = String(
  input.result ||
  ''
).trim();


// --------------------------------------------------
// REPLY TEXT
// --------------------------------------------------

let reply = String(
  input.reply ||
  input.log_text ||
  ''
).trim();


// If this is the routed-response branch, recover its response
// without making Build Outbound depend on it being executed.
if (!reply && route.response) {
  reply = String(
    route.response.log_text ||
    route.response.reply ||
    ''
  ).trim();
}


// If there is still no reply, use a safe fallback.
if (!reply) {
  reply = 'Pabbas could not process that request.';
}


// --------------------------------------------------
// ORDER ITEMS
// --------------------------------------------------

const items =
  Array.isArray(input.items_json) && input.items_json.length
    ? input.items_json
    : Array.isArray(input.items)
      ? input.items
      : [];

const lines = items
  .map((item) => {
    const name = String(item?.name || 'Item').trim();
    const quantity = Number(item?.quantity || 1);

    return `${name} x${quantity}`;
  })
  .join('\n');

const total = Number(input.total || 0);


// --------------------------------------------------
// VALIDATE PHONE
// --------------------------------------------------

if (!phone) {
  throw new Error(
    'Build Outbound Message: customer phone is missing. ' +
    'Extract Inbound Message did not contain a phone number.'
  );
}


// --------------------------------------------------
// BUILD OUTGOING MESSAGE
// --------------------------------------------------

let text = reply;
let interactive = null;


// ==================================================
// CREATE / AMEND ORDER
// ==================================================

if (action === 'create' || action === 'amend') {

  text =
    `${action === 'create' ? 'Order draft' : 'Order updated'}` +
    `${orderNumber ? ` ${orderNumber}` : ''}:\n` +
    `${lines || 'No items'}\n` +
    `Total: Rs ${total.toFixed(2)}\n\n` +
    `Please confirm your order.`;

  if (orderNumber) {

    interactive = {
      type: 'button',

      body: {
        text
      },

      action: {
        buttons: [
          {
            type: 'reply',

            reply: {
              id: `btn_confirm:${orderNumber}`,
              title: 'Confirm order'
            }
          },

          {
            type: 'reply',

            reply: {
              id: `btn_cancel:${orderNumber}`,
              title: 'Cancel order'
            }
          }
        ]
      }
    };
  }
}


// ==================================================
// CONFIRM
// ==================================================

else if (action === 'confirm') {

  text =
    `Order ${orderNumber || ''} confirmation result: ` +
    `${result || 'processed'}.`.trim();
}


// ==================================================
// CANCEL
// ==================================================

else if (action === 'cancel') {

  text =
    `Order ${orderNumber || ''} cancellation result: ` +
    `${result || 'processed'}.`.trim();
}


// ==================================================
// NORMAL REPLY / GREETING / AI
// ==================================================

else if (action === 'reply') {
  
  const ctx = $('Retrieve Chat Context').first()?.json || {};
  const isNew = !ctx.history || ctx.history.length === 0;
  
  // Checking if they explicitly clicked our buttons
  const isMenuIntent = (String(inbound.content).toLowerCase().includes('btn_menu') || String(inbound.content).toLowerCase().includes('btn_order') || String(inbound.content).toLowerCase().includes('explore menu') || String(inbound.content).toLowerCase().includes('order now'));

  text = `${reply}`;

  if (ctaUrl && (isNew || isMenuIntent)) {
    interactive = {
      type: 'button',
      body: {
        text: `${reply}\n\nReady to browse the menu or place an order?`
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `btn_order`,
              title: '🛍️ Order Now'
            }
          },
          {
            type: 'reply',
            reply: {
              id: `btn_menu`,
              title: '🍦 Explore Menu'
            }
          },
          {
            type: 'reply',
            reply: {
              id: `btn_ask`,
              title: '💬 Ask Me Anything'
            }
          }
        ]
      }
    };
  } else if (ctaUrl) {
    // If not new and not explicitly requested, just append plain text URL gracefully if we want, or do nothing.
    // We will do nothing to avoid spamming the CTA.
  }
}

;