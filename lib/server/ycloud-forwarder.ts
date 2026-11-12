// Forwards accepted YCloud inbox rows to the Pabbas workflow. Rider completion buttons
// bypass customer AI and go straight to the protected delivery status endpoint.
// Delivery is at-least-once: consumers must treat x-pabbas-event-id as an idempotency key.

export type ForwarderConfig = { url: string; secret: string; appBaseUrl: string }
const fallbackAppBaseUrl = 'https://pabbas-one.vercel.app'

type InboxRow = { id: string; provider_event_id: string; attempts: number; payload: unknown }
type ForwarderAdminClient = {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown | null }>
}

// Disabled unless explicitly enabled, so deploying this code changes nothing by itself.
export function forwarderConfig(env: Record<string, string | undefined> = process.env): ForwarderConfig | null {
  if (env.PABBAS_WHATSAPP_FORWARDING_ENABLED?.trim().toLowerCase() === 'false') return null
  const url = env.N8N_WHATSAPP_INBOUND_WEBHOOK_URL?.trim() || ''
  const secret = env.PABBAS_WHATSAPP_INBOUND_SECRET?.trim() || ''
  if (!url.startsWith('https://') || !secret) return null
  return { url, secret, appBaseUrl: resolveAppBaseUrl(env) }
}

type RiderDeliveryAction =
  | { recognized: false }
  | { recognized: true; error: string }
  | { recognized: true; order_number: string; rider_phone: string; payment_status: 'collected' | 'unpaid' }

type RiderWebhookAction =
  | { recognized: false }
  | { recognized: true; error: string }
  | { recognized: true; action: 'accept' | 'decline'; order_number: string; rider_phone: string }
  | { recognized: true; action: 'deliver'; order_number: string; rider_phone: string; payment_status: 'collected' | 'unpaid' }

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeInboundPhone(value: unknown): string | null {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) digits = `91${digits}`
  return digits.length >= 11 && digits.length <= 15 ? digits : null
}

export function ycloudInboundPhone(payloadValue: unknown): string | null {
  const payload = asObject(payloadValue)
  const data = asObject(payload.data)
  const message = asObject(
    payload.whatsappInboundMessage || payload.whatsappMessage || payload.message ||
      data.whatsappInboundMessage || data.whatsappMessage || data.message,
  )
  const sender = asObject(message.sender)
  return normalizeInboundPhone(message.from || sender.phone || data.from || payload.from)
}

function normalizeHttpsBaseUrl(value: string | undefined): string {
  const candidate = value?.trim()
  if (!candidate) return ''
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`
  try {
    const url = new URL(withProtocol)
    return url.protocol === 'https:' ? url.origin : ''
  } catch {
    return ''
  }
}

function resolveAppBaseUrl(env: Record<string, string | undefined>): string {
  return normalizeHttpsBaseUrl(env.NEXT_PUBLIC_SITE_URL)
    || normalizeHttpsBaseUrl(env.VERCEL_PROJECT_PRODUCTION_URL)
    || normalizeHttpsBaseUrl(env.VERCEL_URL)
    || fallbackAppBaseUrl
}

/** Identify rider completion buttons before an inbound event reaches the customer AI workflow. */
export function riderDeliveryAction(payloadValue: unknown): RiderDeliveryAction {
  const payload = asObject(payloadValue)
  const data = asObject(payload.data)
  const message = asObject(
    payload.whatsappInboundMessage || payload.whatsappMessage || payload.message ||
      data.whatsappInboundMessage || data.whatsappMessage || data.message,
  )
  const interactive = asObject(message.interactive)
  const buttonReply = asObject(interactive.button_reply)
  const listReply = asObject(interactive.list_reply)
  const rawText = asObject(message.text).body
  const rawContent = buttonReply.id || listReply.id || rawText || message.body
  const content = typeof rawContent === 'string' ? rawContent.trim() : ''
  const match = /^deliver_(collected|unpaid)_(.+)$/i.exec(content)
  if (!match) return { recognized: false }

  const sender = asObject(message.sender)
  const rawPhone = message.from || sender.phone || data.from || payload.from
  const riderPhone = typeof rawPhone === 'string' || typeof rawPhone === 'number' ? String(rawPhone).trim() : ''
  const orderNumber = match[2].trim()
  if (!orderNumber || !riderPhone) return { recognized: true, error: 'incomplete_payload' }

  return {
    recognized: true,
    order_number: orderNumber,
    rider_phone: riderPhone,
    payment_status: match[1].toLowerCase() === 'unpaid' ? 'unpaid' : 'collected',
  }
}

/** Keep rider controls out of the customer AI workflow, including older accept/decline buttons. */
export function riderWebhookAction(payloadValue: unknown): RiderWebhookAction {
  const delivery = riderDeliveryAction(payloadValue)
  if (delivery.recognized) {
    if ('error' in delivery) return delivery
    return { ...delivery, action: 'deliver' }
  }

  const payload = asObject(payloadValue)
  const data = asObject(payload.data)
  const message = asObject(
    payload.whatsappInboundMessage || payload.whatsappMessage || payload.message ||
      data.whatsappInboundMessage || data.whatsappMessage || data.message,
  )
  const interactive = asObject(message.interactive)
  const buttonReply = asObject(interactive.button_reply)
  const listReply = asObject(interactive.list_reply)
  const rawText = asObject(message.text).body
  const rawContent = buttonReply.id || listReply.id || rawText || message.body
  const content = typeof rawContent === 'string' ? rawContent.trim() : ''
  const match = /^(accept|decline)_(.+)$/i.exec(content)
  if (!match) return { recognized: false }

  const sender = asObject(message.sender)
  const rawPhone = message.from || sender.phone || data.from || payload.from
  const riderPhone = typeof rawPhone === 'string' || typeof rawPhone === 'number'
    ? String(rawPhone).replace(/\D/g, '')
    : ''
  const orderNumber = match[2].trim()
  if (!orderNumber || !riderPhone) return { recognized: true, error: 'incomplete_payload' }

  return {
    recognized: true,
    action: match[1].toLowerCase() as 'accept' | 'decline',
    order_number: orderNumber,
    rider_phone: riderPhone,
  }
}

export async function drainYCloudInbox(
  admin: ForwarderAdminClient,
  config: ForwarderConfig,
  { limit = 10, timeoutMs = 8000, fetchImpl = fetch }: { limit?: number; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
) {
  const result = { claimed: 0, processed: 0, retryable: 0, failed: 0, lost: 0 }
  const { data, error } = await admin.rpc('claim_ycloud_events', { p_limit: limit, p_lease_seconds: 120 })
  if (error) throw new Error('inbox_claim_failed')
  const rows = (data ?? []) as InboxRow[]
  result.claimed = rows.length

  for (const row of rows) {
    let errorCode: string | null = null
    try {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {}
      if (payload.type === 'whatsapp.message.updated') {
        errorCode = null
      } else {
        const riderAction = riderWebhookAction(payload)
        const inboundEvent = payload.type === 'whatsapp.inbound_message.received'
        const inboundPhone = inboundEvent ? ycloudInboundPhone(payload) : null
        let destination = config.url
        let requestBody = row.payload

        if (riderAction.recognized) {
          if ('error' in riderAction) {
            errorCode = `rider_action_${riderAction.error}`
          } else {
            try {
              const appUrl = new URL(config.appBaseUrl)
              if (appUrl.protocol !== 'https:') throw new Error('insecure_app_url')
              const route = riderAction.action === 'deliver'
                ? 'deliver'
                : riderAction.action
              destination = new URL(`/api/webhooks/rider/${route}`, appUrl).toString()
              requestBody = riderAction.action === 'deliver'
                ? {
                    order_number: riderAction.order_number,
                    rider_phone: riderAction.rider_phone,
                    payment_status: riderAction.payment_status,
                  }
                : {
                    order_number: riderAction.order_number,
                    rider_phone: riderAction.rider_phone,
                  }
            } catch {
              errorCode = 'rider_action_app_url_missing_or_insecure'
            }
          }
        }

        if (!errorCode && (!inboundEvent || inboundPhone)) {
          const res = await fetchImpl(destination, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-pabbas-whatsapp-secret': config.secret,
              'x-pabbas-event-id': row.provider_event_id,
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(timeoutMs),
          })
          if (!res.ok) errorCode = `http_${res.status}`
        }
      }
    } catch (e) {
      errorCode = e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'network'
    }

    const finish = await admin.rpc('finish_ycloud_event', {
      p_id: row.id, p_attempt: row.attempts, p_ok: errorCode === null, p_error_code: errorCode,
    })
    const status = finish.error ? null : finish.data as string | null
    if (status === 'processed' || status === 'retryable' || status === 'failed') result[status]++
    else result.lost++
  }
  return result
}
