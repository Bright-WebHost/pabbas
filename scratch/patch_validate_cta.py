import json

with open('scratch/live_workflow_patched.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

new_code = """const input = $input.first().json || {};

// Since the HTTP node (Resolve Customer Identity) overwrites input data,
// we MUST recover the original AI or Route data here before building the message!
let originalData = {};
try { originalData = { ...originalData, ...$('Build Routed Response').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Route Confirm Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Route Cancel Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Validate Menu And Price').first().json }; } catch(e) {}

// If an Order Action Switch HTTP node executed, merge its output too
try { originalData = { ...originalData, ...$('Create Draft Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Amend Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Confirm Order').first().json }; } catch(e) {}
try { originalData = { ...originalData, ...$('Cancel Order').first().json }; } catch(e) {}

// Finally merge with whatever the HTTP node itself outputted (e.g. cta_url)
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
];"""

for node in wf['nodes']:
    if node['name'] == 'Validate CTA Customer':
        node['parameters']['jsCode'] = new_code
        print('Patched Validate CTA Customer successfully.')

with open('scratch/live_workflow_patched.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f)
