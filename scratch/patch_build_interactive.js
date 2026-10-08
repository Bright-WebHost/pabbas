const fs = require('fs');
let data = JSON.parse(fs.readFileSync('scratch/ai_workflow.json', 'utf8'));
const buildNode = data.nodes.find(n => n.name === 'Build Outbound Message');

if (buildNode) {
  buildNode.parameters.jsCode = `/*
 * PABBAS - BUILD OUTBOUND MESSAGE
 * Handles Interactive Buttons!
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
const renderButtons = String(input.render_buttons || '').trim();
const deliveryAddress = String(input.delivery_address || '').trim();

let reply = String(input.reply || input.log_text || '').trim();

if (!reply && route.response) {
  reply = String(route.response.log_text || route.response.reply || '').trim();
}

if (action === 'checkout') {
  return []; // Pabbas webhook handles the final success message!
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
  text = \`\${nameGreeting} ?? Welcome to Pabbas! ??\\n\\nHow can I help you today?\`;
}
else if (action === 'welcome') {
  text = \`\${nameGreeting} ?? Welcome to Pabbas! ??\\n\\nI can help you order directly on WhatsApp, explore our menu, or answer any questions.\\n\\nChoose an option below ??\`;
  
  if (ctaUrl) {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: \`btn_order\`, title: '??? Order on WhatsApp' } },
          { type: 'reply', reply: { id: \`btn_menu\`, title: '?? Explore Menu' } },
          { type: 'reply', reply: { id: \`btn_ask\`, title: '?? Ask Me Anything' } }
        ]
      }
    };
  }
}
else if (action === 'menu_cta') {
  text = reply || \`Sure! ?? You can explore the full menu and place an order securely here.\`;
}
else if (action === 'start_whatsapp_order') {
  text = \`Absolutely! ?? What would you like to order?\`;
}
else if (action === 'start_questions') {
  text = \`Of course! ?? What would you like to know?\`;
}
else if (action === 'add' || action === 'remove') {
  text = \`\${reply}\`;
  
  interactive = {
    type: 'button',
    body: { text },
    action: {
      buttons: [
        { type: 'reply', reply: { id: \`btn_add_more\`, title: '??? Add more' } },
        { type: 'reply', reply: { id: \`btn_checkout\`, title: '? Place Order' } }
      ]
    }
  };
}
else if (action === 'reply') {
  text = \`\${reply}\`;
  
  if (renderButtons === 'mode') {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: \`btn_takeaway\`, title: '?? Takeaway' } },
          { type: 'reply', reply: { id: \`btn_delivery\`, title: '?? Delivery' } }
        ]
      }
    };
  } else if (renderButtons === 'confirm_takeaway') {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: \`btn_confirm_takeaway\`, title: '?? Confirm Order' } }
        ]
      }
    };
  } else if (renderButtons === 'confirm_delivery') {
    interactive = {
      type: 'button',
      body: { text },
      action: {
        buttons: [
          { type: 'reply', reply: { id: \`btn_confirm_delivery:\${deliveryAddress}\`, title: '?? Confirm Order' } }
        ]
      }
    };
  }
}

// Fallback CTA
if (!interactive && ctaUrl && ['reply', 'start_whatsapp_order', 'start_questions', 'menu_cta'].includes(action)) {
  interactive = {
    type: 'cta_url',
    body: { text },
    action: {
      name: 'cta_url',
      parameters: {
        display_text: '?? Explore Menu',
        url: ctaUrl
      }
    }
  };
}


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
`;
}

const url = 'https://staff.brightmedia.tech/api/v1/workflows/BfhcbxFiXa4Vga51';
const headers = { 
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmI1NzdiMy0zODNlLTQ3ZjctYjdjZi0xYzA4NmExNWViN2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMzMzODgwYWItODMxOC00NjhkLWFlMWQtNjA0MDM4ZDVhMjQ2IiwiaWF0IjoxNzkwNjgwMTAxLCJleHAiOjE3OTMyMTIyMDB9.gcPWHiotygjVOHxf1NFjTOArvZsNkzbOeUqAnfjw-9U',
  'Content-Type': 'application/json'
};

const payload = {
  name: data.name,
  nodes: data.nodes,
  connections: data.connections,
  settings: data.settings || {},
  staticData: data.staticData || null
};

fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) })
  .then(res => res.json())
  .then(r => console.log('Update success:', r.id))
  .catch(console.error);

