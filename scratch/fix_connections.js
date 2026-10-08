const fs = require('fs');
const dotenv = fs.readFileSync('.env.local', 'utf-8');
const apiKey = dotenv.match(/N8N_API_KEY=(.+)/)[1].trim();

const w = JSON.parse(fs.readFileSync('debug_bridge.json', 'utf-8'));

for (const n of w.nodes) {
  if (n.name === 'Confirm Order') {
    n.parameters.jsCode = `const orderData = $('Place Final Order').first().json || {};
const validateData = $('Validate Menu And Price').first().json || {};
return [{
  json: {
    customer_phone: validateData.customer_phone,
    customer_name: validateData.customer_name,
    channel_user_id: validateData.channel_user_id,
    action: 'reply',
    reply: \`Awesome! Your order #\${orderData.order_number || ''} has been successfully placed 🎉\\n\\nOur team is preparing it right now!\`,
    order_number: orderData.order_number
  }
}];`;
  }
  
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

try { originalData = { ...originalData, ...$('Build Add Reply').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Build Rem Reply').first().json }; } catch(e) {}

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
];`;
  }
}

// Fix connections! Connect Build Add/Rem Reply to Resolve Customer Identity for CTA instead of Build Outbound Message.
if (w.connections['Build Add Reply'] && w.connections['Build Add Reply'].main && w.connections['Build Add Reply'].main[0]) {
  w.connections['Build Add Reply'].main[0] = [{ node: 'Resolve Customer Identity for CTA', type: 'main', index: 0 }];
}
if (w.connections['Build Rem Reply'] && w.connections['Build Rem Reply'].main && w.connections['Build Rem Reply'].main[0]) {
  w.connections['Build Rem Reply'].main[0] = [{ node: 'Resolve Customer Identity for CTA', type: 'main', index: 0 }];
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
    console.log('Fixed Confirm Order and Add/Rem Reply Connections!');
  }
});
