const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('production_bridge.json', 'utf-8'));

for (const n of w.nodes) {
  if (n.name === 'Build Outbound Message') {
    n.parameters.jsCode = `/*
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

const firstName = customerName ? customerName.split(/\\s+/)[0] : '';
const nameGreeting = firstName ? \`Hey \${firstName}!\` : \`Hey there!\`;

// ==================================================
// ACTION ROUTING
// ==================================================

if (action === 'create' || action === 'amend') {
  const items = Array.isArray(input.items_json) && input.items_json.length ? input.items_json : Array.isArray(input.items) ? input.items : [];
  const lines = items.map((item) => \`\${String(item?.name || 'Item').trim()} x\${Number(item?.quantity || 1)}\`).join('\\n');
  const total = Number(input.total || 0);

  text = \`\${action === 'create' ? 'Order draft' : 'Order updated'}\${orderNumber ? \` \${orderNumber}\` : ''}:\\n\${lines || 'No items'}\\nTotal: Rs \${total.toFixed(2)}\\n\\nPlease confirm your order.\`;

  if (orderNumber) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: \`btn_confirm:\${orderNumber}\`, title: 'Confirm order' } },
          { type: 'reply', reply: { id: \`btn_cancel:\${orderNumber}\`, title: 'Cancel order' } }
        ]
      }
    };
  }
}
else if (action === 'confirm') {
  text = \`Order \${orderNumber || ''} confirmation result: \${result || 'processed'}.\`.trim();
}
else if (action === 'cancel') {
  text = \`Order \${orderNumber || ''} cancellation result: \${result || 'processed'}.\`.trim();
}
else if (action === 'greet') {
  text = \`\${nameGreeting} 👋 Welcome to Pabbas! 🍨\\n\\nHow can I help you today?\`;
}
else if (action === 'welcome') {
  text = \`\${nameGreeting} 👋 Welcome to Pabbas! 🍨\\n\\nWhat are you craving today? 😋\\n\\nI can help you order directly on WhatsApp, explore our menu, or answer any questions.\\n\\nChoose an option below 👇\`;
  
  if (ctaUrl) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: \`btn_order\`, title: '🛍️ Order on WhatsApp' } },
          { type: 'reply', reply: { id: \`btn_menu\`, title: '🍦 Explore Menu' } },
          { type: 'reply', reply: { id: \`btn_ask\`, title: '💬 Ask Me Anything' } }
        ]
      }
    };
  }
}
else if (action === 'menu_cta') {
  text = reply || \`Sure! 🍦 You can explore the full menu and place an order securely here.\`;
}
else if (action === 'start_whatsapp_order') {
  text = \`Absolutely! 😋 What would you like to order?\`;
}
else if (action === 'start_questions') {
  text = \`Of course! 😊 What would you like to know?\`;
}
else if (action === 'reply' || action === 'add' || action === 'remove' || action === 'checkout') {
  text = \`\${reply}\`;
}

// Ensure CTA URL is aggressively appended when there isn't another interactive component
if (!interactive && ctaUrl && ['reply', 'add', 'remove', 'checkout', 'start_whatsapp_order', 'start_questions', 'menu_cta'].includes(action)) {
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
];`;
  }
  
  // Also fix the fact that Validate CTA Customer doesn't merge data from Cart Add Item and Cart Remove Item properly.
  // Validate CTA Customer only has tries for "Validate Menu And Price" and "Amend Order", etc.
  if (n.name === 'Validate CTA Customer') {
    n.parameters.jsCode = `
const input = $input.first().json || {};

let originalData = {};
try { originalData = { ...originalData, ...$('Build Routed Response').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Route Confirm Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Route Cancel Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Validate Menu And Price').first().json }; } catch(e) {}

try { originalData = { ...originalData, ...$('Create Draft Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Amend Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Confirm Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Cancel Order').first().json }; } catch(e) {}

// ADD Cart Add Item and Cart Remove Item to recover their output data!!
try { originalData = { ...originalData, ...$('Cart Add Item').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Cart Remove Item').first().json }; } catch(e) {}

const merged = { ...originalData, ...input };

const phone = String(merged.phone || merged.customer_phone || '').trim();
const channelUserId = String(merged.channel_user_id || '').trim();
const name = String(merged.name || merged.customer_name || '').trim();
const ctaUrl = String(merged.cta_url || '').trim();

const ctaReady = Boolean(phone) && Boolean(channelUserId) && Boolean(ctaUrl);

return [
  {
    json: {
      ...merged,
      customer_phone: phone,
      customer_name: name,
      channel_user_id: channelUserId,
      cta_url: ctaUrl,
      cta_ready: ctaReady
    }
  }
];
    `;
  }
}

fetch('https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51', {
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
    console.log('Fixed n8n Build Outbound Message to aggressively append Menu CTA button');
  }
});
