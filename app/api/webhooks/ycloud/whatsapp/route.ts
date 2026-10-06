import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Replay protection tolerance (5 minutes in milliseconds)
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // 3. Read the request body as the RAW request body using request.text()
    const rawBody = await request.text();

    // 4. Read headers
    const signatureHeader = request.headers.get('ycloud-signature');
    const endpointId = request.headers.get('x-webhook-endpoint-id');

    if (!signatureHeader) {
      console.warn('YCloud Webhook Error: Missing YCloud-Signature header');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 5. Server-only environment variable YCLOUD_WEBHOOK_SECRET
    const secret = process.env.YCLOUD_WEBHOOK_SECRET;
    if (!secret) {
      console.error('YCloud Webhook Error: YCLOUD_WEBHOOK_SECRET is not configured');
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    // 6. Verify YCloud-Signature
    // Format: t=<unix_timestamp>,s=<hex_signature>
    const signatureParts = signatureHeader.split(',');
    let timestampStr = '';
    let providedSignature = '';

    for (const part of signatureParts) {
      const [key, value] = part.split('=');
      if (key === 't') timestampStr = value;
      if (key === 's') providedSignature = value;
    }

    if (!timestampStr || !providedSignature) {
      console.warn('YCloud Webhook Error: Invalid signature format');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      console.warn('YCloud Webhook Error: Invalid timestamp in signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 9. Replay protection
    const now = Date.now();
    const timestampMs = timestamp * 1000;
    if (Math.abs(now - timestampMs) > REPLAY_TOLERANCE_MS) {
      console.warn('YCloud Webhook Error: Request timestamp outside tolerance (replay protection)');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Calculate expected signature
    const payloadToSign = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign)
      .digest('hex');

    // 7. Timing-safe comparison
    try {
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const providedBuffer = Buffer.from(providedSignature, 'hex');

      if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
        console.warn('YCloud Webhook Error: Signature mismatch');
        return new NextResponse('Unauthorized', { status: 401 });
      }
    } catch (error) {
      console.warn('YCloud Webhook Error: Signature comparison failed');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 10. Parse JSON AFTER successful signature verification
    let eventData;
    try {
      eventData = JSON.parse(rawBody);
    } catch (e) {
      console.warn('YCloud Webhook Error: Invalid JSON body');
      return new NextResponse('Bad Request', { status: 400 });
    }

    // 11. Accept only specific type
    const eventType = eventData.type;
    if (eventType !== 'whatsapp.inbound_message.received') {
      // 12. For unsupported event types, return HTTP 200 without forwarding
      console.log(`YCloud Webhook: Ignored unsupported event type '${eventType}'`);
      return new NextResponse('OK', { status: 200 });
    }

    // --- BEGIN INTERCEPTION FOR RIDER ACCEPT ---
    const message = eventData.message || eventData.whatsappInboundMessage || {};
    if (message.type === 'interactive') {
      const buttonId = message.interactive?.button_reply?.id;
      if (buttonId && buttonId.startsWith('accept_')) {
        const orderNumber = buttonId.replace('accept_', '');
        // Clean phone number to digits only (e.g., +919180348124 -> 919180348124)
        const riderPhone = (message.from || message.sender?.phone || '').replace(/[^0-9]/g, '');
        
        if (orderNumber && riderPhone) {
          const acceptUrl = new URL('/api/webhooks/rider/accept', request.url).toString();
          try {
            const acceptRes = await fetch(acceptUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-pabbas-whatsapp-secret': process.env.PABBAS_WHATSAPP_INBOUND_SECRET || ''
              },
              body: JSON.stringify({ order_number: orderNumber, rider_phone: riderPhone })
            });
            
            if (acceptRes.ok) {
              console.log(`[RIDER ACCEPT] Successfully processed acceptance for order ${orderNumber} by ${riderPhone}`);
            } else {
              console.error(`[RIDER ACCEPT] Failed to process acceptance for order ${orderNumber}: ${await acceptRes.text()}`);
            }
          } catch(err) {
            console.error('[RIDER ACCEPT] Internal API call error', err);
          }
        }
        
        // Return HTTP 200 so we do NOT forward this rider interactive message to the customer n8n AI Bridge
        return new NextResponse('OK', { status: 200 });
      } else if (buttonId && buttonId.startsWith('decline_')) {
        const orderNumber = buttonId.replace('decline_', '');
        const riderPhone = (message.from || message.sender?.phone || '').replace(/[^0-9]/g, '');
        
        if (orderNumber && riderPhone) {
          const declineUrl = new URL('/api/webhooks/rider/decline', request.url).toString();
          try {
            const declineRes = await fetch(declineUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-pabbas-whatsapp-secret': process.env.PABBAS_WHATSAPP_INBOUND_SECRET || ''
              },
              body: JSON.stringify({ order_number: orderNumber, rider_phone: riderPhone })
            });
            
            if (declineRes.ok) {
              console.log(`[RIDER DECLINE] Successfully processed decline for order ${orderNumber} by ${riderPhone}`);
            } else {
              console.error(`[RIDER DECLINE] Failed to process decline for order ${orderNumber}: ${await declineRes.text()}`);
            }
          } catch(err) {
            console.error('[RIDER DECLINE] Internal API call error', err);
          }
        }
        
        // Return HTTP 200 so we do NOT forward this rider interactive message to the customer n8n AI Bridge
        return new NextResponse('OK', { status: 200 });
      }
    }
    // --- END INTERCEPTION FOR RIDER ACCEPT/DECLINE ---

    // 13. Forward the verified event to the n8n production webhook
    const n8nUrl = process.env.N8N_WHATSAPP_INBOUND_WEBHOOK_URL;
    const n8nSecret = process.env.PABBAS_WHATSAPP_INBOUND_SECRET;

    if (!n8nUrl) {
      console.error('YCloud Webhook Error: N8N_WHATSAPP_INBOUND_WEBHOOK_URL is not configured');
      return new NextResponse('Internal Server Error', { status: 500 });
    }
    
    if (!n8nSecret) {
      console.error('YCloud Webhook Error: PABBAS_WHATSAPP_INBOUND_SECRET is not configured');
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    // Forwarding to n8n
    try {
      const n8nResponse = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 14. Authenticate to n8n
          'x-pabbas-whatsapp-secret': n8nSecret,
        },
        // 15. Forward complete verified YCloud event JSON
        body: JSON.stringify(eventData),
      });

      if (!n8nResponse.ok) {
        console.error(`YCloud Webhook Error: Forwarding to n8n failed with status ${n8nResponse.status}`);
        // Return 200 to YCloud anyway so it doesn't retry endlessly if n8n is down, 
        // or we could return 500 if we want YCloud to retry.
        // Assuming we return 200 after successful processing our side, but returning 500 might be safer for reliability.
        // The instructions say "Return HTTP 200 quickly after successful validation/forwarding." 
      } else {
        console.log('YCloud Webhook: Successfully forwarded inbound message to n8n');
      }
    } catch (error) {
      console.error('YCloud Webhook Error: Exception while forwarding to n8n', error instanceof Error ? error.message : 'Unknown error');
      // Do not expose details
    }

    // 17. Return HTTP 200 quickly
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('YCloud Webhook Error: Unhandled exception', error instanceof Error ? error.message : 'Unknown error');
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
