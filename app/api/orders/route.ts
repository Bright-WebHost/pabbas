import { NextResponse } from 'next/server'
import { getSessionCookie } from '@/lib/session/cookies'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const session = await getSessionCookie()
    if (!session || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const body = await request.json()
    const {
      order_type,
      customer_name,
      customer_phone,
      delivery_address,
      landmark,
      pincode,
      scheduled_time,
      payment_method,
      idempotency_key,
      cart_items,
      table_id,
      party_size,
    } = body

    if (!order_type || !['delivery', 'pickup', 'dine-in'].includes(order_type)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    if (!Array.isArray(cart_items) || cart_items.length === 0) {
      return NextResponse.json({ error: 'Cart cannot be empty' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch customer details from app_customers table
    const { data: customerData } = await adminClient
      .from('app_customers')
      .select('name, phone')
      .eq('id', session.customerId)
      .single()

    const resolvedName = customer_name || customerData?.name || 'Valued Customer'
    const resolvedPhone = customerData?.phone || customer_phone || ''

    const { data, error } = await (adminClient.rpc as any)('create_customer_order', {
      p_customer_id: session.customerId,
      p_order_type: order_type,
      p_customer_name: resolvedName,
      p_customer_phone: resolvedPhone,
      p_delivery_address: delivery_address || null,
      p_landmark: landmark || null,
      p_pincode: pincode || null,
      p_scheduled_time: scheduled_time || null,
      p_payment_method: payment_method || 'upi',
      p_idempotency_key: idempotency_key || null,
      p_cart_items: cart_items,
      p_table_id: table_id || null,
      p_party_size: party_size || 1,
    })

    if (error) {
      console.error('[POST /api/orders] RPC error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Phase 7B.4: Immediate asynchronous webhook dispatch to n8n
    // Reliability rule: Outbox table in database is the true reliability mechanism.
    // The immediate webhook is a low-latency optimization. n8n outages never fail checkout.
    if (!data?.is_duplicate && data?.event_id && process.env.N8N_ORDER_WEBHOOK_URL) {
      const webhookUrl = process.env.N8N_ORDER_WEBHOOK_URL
      const webhookSecret = process.env.PABBAS_N8N_WEBHOOK_SECRET || ''

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pabbas-webhook-secret': webhookSecret,
          },
          body: JSON.stringify({
            event_id: data.event_id,
            event_type: 'order.created',
            payload: data.event_payload,
          }),
          signal: controller.signal,
        })
          .then((res) => {
            clearTimeout(timeoutId)
            if (!res.ok) {
              console.warn(`[POST /api/orders] n8n webhook returned HTTP ${res.status}. Outbox reconciler will handle.`)
            }
          })
          .catch((fetchErr) => {
            clearTimeout(timeoutId)
            // Log safely without leaking secret headers or tokens
            console.warn('[POST /api/orders] Immediate webhook delivery failed (outbox will reconcile):', fetchErr?.message || 'Network timeout')
          })
      } catch (dispatchErr: any) {
        console.warn('[POST /api/orders] Could not initiate webhook dispatch (outbox will reconcile):', dispatchErr?.message)
      }
    }

    return NextResponse.json({ success: true, order: data })
  } catch (err: any) {
    console.error('[POST /api/orders] Internal error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to place order' }, { status: 500 })
  }
}

