import { NextResponse } from 'next/server'
import { getSessionCookie } from '@/lib/session/cookies'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/dev/whatsapp/ai
 *
 * Secure server-side bridge between the WhatsApp Simulator and the n8n AI Agent.
 *
 * Identity resolution (in order of priority):
 * 1. Session cookie (from /auth/whatsapp) — the production path.
 * 2. channelUserId from the request body — dev-only fallback.
 *    This is needed because the customer may chat BEFORE clicking
 *    "View Menu & Order" (which is when the session cookie is set).
 *    The channelUserId is resolved server-side against app_customers,
 *    never trusted blindly from the browser.
 *
 * In production, only path (1) will exist. Path (2) is gated behind
 * NODE_ENV !== 'production'.
 */

/** Development-only customer directory (mirrors session/route.ts) */
const DEV_CUSTOMERS: Record<string, { phone: string; name: string }> = {
  dev_customer_a: { phone: '+919876500001', name: 'Dev Customer A' },
  dev_customer_b: { phone: '+919876500002', name: 'Dev Customer B' },
}

export async function POST(request: Request) {
  let body: { message?: string; conversation_id?: string; channelUserId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { message, conversation_id, channelUserId } = body
  if (!message || !conversation_id) {
    return NextResponse.json({ error: 'message and conversation_id are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  let customerId: string
  let customerPhone: string

  // --- Identity Resolution ---
  const session = await getSessionCookie()

  if (session) {
    // Path 1: Production path — use the authenticated session cookie
    const { data: customer, error } = await admin
      .from('app_customers')
      .select('id, phone')
      .eq('id', session.customerId)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    }
    customerId = customer.id
    customerPhone = customer.phone
  } else if (channelUserId && process.env.NODE_ENV !== 'production') {
    // Path 2: Dev-only fallback — resolve from channelUserId
    const devCustomer = DEV_CUSTOMERS[channelUserId]
    if (!devCustomer) {
      return NextResponse.json({ error: 'Unknown dev customer.' }, { status: 400 })
    }

    const { data: customer, error } = await admin
      .from('app_customers')
      .select('id, phone')
      .eq('channel', 'whatsapp')
      .eq('channel_user_id', channelUserId)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: 'Dev customer not found in database. Send a message first to create the session.' }, { status: 404 })
    }
    customerId = customer.id
    customerPhone = customer.phone
  } else {
    return NextResponse.json({ error: 'Unauthorized. No active session.' }, { status: 401 })
  }

  // --- Call n8n AI webhook ---
  const webhookUrl = process.env.N8N_AI_WEBHOOK_URL
  const webhookSecret = process.env.PABBAS_AI_WEBHOOK_SECRET

  if (!webhookUrl || !webhookSecret) {
    console.error('Missing N8N_AI_WEBHOOK_URL or PABBAS_AI_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pabbas-webhook-secret': webhookSecret,
      },
      body: JSON.stringify({
        customer_id: customerId,
        phone: customerPhone,
        message: message,
        conversation_id: conversation_id,
      }),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text().catch(() => '')
      console.error('n8n returned error status:', n8nRes.status, errText)
      return NextResponse.json(
        { error: "Sorry, I'm having trouble connecting right now. You can still use the Pabbas ordering page to place your order." },
        { status: 502 }
      )
    }

    const n8nData = await n8nRes.json()

    return NextResponse.json({
      reply: n8nData.output || n8nData.reply || n8nData.message || 'Sorry, I did not understand that.',
    })
  } catch (err) {
    console.error('Failed to reach n8n:', err)
    return NextResponse.json(
      { error: "Sorry, I'm having trouble connecting right now. You can still use the Pabbas ordering page to place your order." },
      { status: 502 }
    )
  }
}

