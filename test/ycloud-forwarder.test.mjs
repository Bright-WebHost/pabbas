import test from 'node:test'
import assert from 'node:assert/strict'
import { drainYCloudInbox, forwarderConfig, riderDeliveryAction } from '../lib/server/ycloud-forwarder.ts'

const config = { url: 'https://n8n.example.test/webhook/x', secret: 'synthetic-secret' }
function fakeAdmin(rows, finishStatus = (args) => args.p_ok ? 'processed' : 'retryable') {
  const calls = []
  return {
    calls,
    rpc(fn, args) {
      calls.push({ fn, args })
      if (fn === 'claim_ycloud_events') return Promise.resolve({ data: rows, error: null })
      return Promise.resolve({ data: finishStatus(args), error: null })
    },
  }
}
const row = (n) => ({
  id: `id-${n}`,
  provider_event_id: `evt-${n}`,
  attempts: 1,
  payload: {
    id: `evt-${n}`,
    type: 'whatsapp.inbound_message.received',
    whatsappInboundMessage: { id: `msg-${n}`, from: '+919999999999', text: { body: 'Hello' } },
  },
})

test('forwarding requires an https url and secret and supports explicit opt-out', () => {
  assert.equal(forwarderConfig({}), null)
  assert.equal(forwarderConfig({ PABBAS_WHATSAPP_FORWARDING_ENABLED: 'true', N8N_WHATSAPP_INBOUND_WEBHOOK_URL: 'http://x', PABBAS_WHATSAPP_INBOUND_SECRET: 's' }), null)
  assert.equal(forwarderConfig({ PABBAS_WHATSAPP_FORWARDING_ENABLED: 'false', N8N_WHATSAPP_INBOUND_WEBHOOK_URL: config.url, PABBAS_WHATSAPP_INBOUND_SECRET: 's' }), null)
  assert.deepEqual(forwarderConfig({ N8N_WHATSAPP_INBOUND_WEBHOOK_URL: config.url, PABBAS_WHATSAPP_INBOUND_SECRET: 's', NEXT_PUBLIC_SITE_URL: 'https://pabbas.example.test' }), { url: config.url, secret: 's', appBaseUrl: 'https://pabbas.example.test' })
})

test('resolves the app URL from Vercel settings when NEXT_PUBLIC_SITE_URL is absent or insecure', () => {
  const baseEnv = { PABBAS_WHATSAPP_FORWARDING_ENABLED: 'true', N8N_WHATSAPP_INBOUND_WEBHOOK_URL: config.url, PABBAS_WHATSAPP_INBOUND_SECRET: 's' }
  assert.equal(forwarderConfig({ ...baseEnv, VERCEL_PROJECT_PRODUCTION_URL: 'pabbas-production.example.test' }).appBaseUrl, 'https://pabbas-production.example.test')
  assert.equal(forwarderConfig({ ...baseEnv, NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }).appBaseUrl, 'https://pabbas-one.vercel.app')
  assert.equal(forwarderConfig(baseEnv).appBaseUrl, 'https://pabbas-one.vercel.app')
})

test('extracts the rider phone, order number, and payment choice from YCloud buttons', () => {
  assert.deepEqual(riderDeliveryAction({
    data: { whatsappInboundMessage: { from: '+919999999999', type: 'interactive', interactive: { button_reply: { id: 'deliver_collected_RAS-123' } } } },
  }), { recognized: true, order_number: 'RAS-123', rider_phone: '+919999999999', payment_status: 'collected' })
  assert.deepEqual(riderDeliveryAction({
    whatsappInboundMessage: { from: '+918888888888', type: 'interactive', interactive: { button_reply: { id: 'deliver_unpaid_RAS-124' } } },
  }), { recognized: true, order_number: 'RAS-124', rider_phone: '+918888888888', payment_status: 'unpaid' })
  assert.deepEqual(riderDeliveryAction({ whatsappInboundMessage: { from: '+919999999999', text: { body: 'Hi' } } }), { recognized: false })
})

test('routes rider accept and decline buttons to their protected app endpoints', async () => {
  for (const action of ['accept', 'decline']) {
    const admin = fakeAdmin([{
      ...row(action),
      payload: {
        id: `evt-${action}`,
        type: 'whatsapp.inbound_message.received',
        whatsappInboundMessage: {
          id: `msg-${action}`,
          from: '+919999999999',
          type: 'interactive',
          interactive: { button_reply: { id: `${action}_RAS-314` } },
        },
      },
    }])
    let sentUrl
    let sent
    const result = await drainYCloudInbox(admin, { ...config, appBaseUrl: 'https://pabbas.example.test' }, {
      fetchImpl: async (url, init) => {
        sentUrl = url
        sent = init
        return new Response(null, { status: 200 })
      },
    })
    assert.equal(sentUrl, `https://pabbas.example.test/api/webhooks/rider/${action}`)
    assert.equal(sent.headers['x-pabbas-whatsapp-secret'], config.secret)
    assert.deepEqual(JSON.parse(sent.body), { order_number: 'RAS-314', rider_phone: '919999999999' })
    assert.equal(result.processed, 1)
  }
})

test('sends the header secret and event id, and records success', async () => {
  const admin = fakeAdmin([row(1)])
  let sent
  const result = await drainYCloudInbox(admin, config, { fetchImpl: async (url, init) => { sent = init; return new Response(null, { status: 200 }) } })
  assert.equal(sent.headers['x-pabbas-whatsapp-secret'], 'synthetic-secret')
  assert.equal(sent.headers['x-pabbas-event-id'], 'evt-1')
  assert.deepEqual(JSON.parse(sent.body), row(1).payload)
  assert.deepEqual(admin.calls.find((call) => call.fn === 'finish_ycloud_event').args, { p_id: 'id-1', p_attempt: 1, p_ok: true, p_error_code: null })
  assert.equal(result.processed, 1)
})

test('inbound messages without a verifiable sender are not forwarded', async () => {
  const missingSender = row(11)
  missingSender.payload.whatsappInboundMessage.from = undefined
  let outboundRequests = 0
  const result = await drainYCloudInbox(fakeAdmin([missingSender]), config, { fetchImpl: async () => {
    outboundRequests += 1
    return new Response(null, { status: 200 })
  } })
  assert.equal(outboundRequests, 0)
  assert.equal(result.processed, 1)
})

test('routes rider completion buttons to the protected delivery endpoint instead of the AI workflow', async () => {
  const admin = fakeAdmin([{
    ...row(4),
    payload: {
      id: 'evt-4',
      type: 'whatsapp.inbound_message.received',
      whatsappInboundMessage: {
        id: 'msg-4',
        from: '+919999999999',
        type: 'interactive',
        interactive: { button_reply: { id: 'deliver_collected_RAS-204' } },
      },
    },
  }])
  const configWithApp = { ...config, appBaseUrl: 'https://pabbas.example.test' }
  let sentUrl
  let sent
  const result = await drainYCloudInbox(admin, configWithApp, { fetchImpl: async (url, init) => {
    sentUrl = url
    sent = init
    return new Response(null, { status: 200 })
  } })
  assert.equal(sentUrl, 'https://pabbas.example.test/api/webhooks/rider/deliver')
  assert.equal(sent.headers['x-pabbas-whatsapp-secret'], config.secret)
  assert.equal(sent.headers['x-pabbas-event-id'], 'evt-4')
  assert.deepEqual(JSON.parse(sent.body), { order_number: 'RAS-204', rider_phone: '+919999999999', payment_status: 'collected' })
  assert.equal(result.processed, 1)
})

test('does not send malformed rider buttons into the customer AI workflow', async () => {
  const admin = fakeAdmin([{
    ...row(5),
    payload: {
      id: 'evt-5',
      type: 'whatsapp.inbound_message.received',
      whatsappInboundMessage: { id: 'msg-5', type: 'interactive', interactive: { button_reply: { id: 'deliver_unpaid_RAS-205' } } },
    },
  }])
  let requests = 0
  const result = await drainYCloudInbox(admin, { ...config, appBaseUrl: 'https://pabbas.example.test' }, { fetchImpl: async () => {
    requests += 1
    return new Response(null, { status: 200 })
  } })
  assert.equal(requests, 0)
  assert.equal(result.retryable, 1)
  assert.equal(admin.calls.find((call) => call.fn === 'finish_ycloud_event').args.p_error_code, 'rider_action_incomplete_payload')
})

test('n8n down, auth rejected, and timeouts are recorded as retryable, not lost', async () => {
  const admin = fakeAdmin([row(1), row(2), row(3)])
  const responses = [
    async () => new Response(null, { status: 503 }),
    async () => new Response(null, { status: 403 }),
    async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }) },
  ]
  let i = 0
  const result = await drainYCloudInbox(admin, config, { fetchImpl: () => responses[i++]() })
  assert.deepEqual(admin.calls.filter(c => c.fn === 'finish_ycloud_event').map(c => c.args.p_error_code), ['http_503', 'http_403', 'timeout'])
  assert.equal(result.retryable, 3)
})

test('a lost lease is counted and does not throw', async () => {
  const admin = fakeAdmin([row(1)], () => null)
  const result = await drainYCloudInbox(admin, config, { fetchImpl: async () => new Response(null, { status: 200 }) })
  assert.equal(result.lost, 1)
})

test('claim failure surfaces as an error so the caller can return 503', async () => {
  const admin = { rpc: () => Promise.resolve({ data: null, error: { code: 'x' } }) }
  await assert.rejects(drainYCloudInbox(admin, config), /inbox_claim_failed/)
})
