import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateToken, hashToken, TOKEN_TTL_SECONDS } from '@/lib/session/token';

/**
 * GET /api/ai/tools/customer/lookup
 * 
 * Secure server-side endpoint for n8n to resolve a WhatsApp phone number
 * into a Pabbas customer_id. Creates a stub customer if one doesn't exist.
 * Also generates a secure one-time session token for the CTA.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    // Authenticate the request from n8n
    const secretHeader = request.headers.get('x-pabbas-ai-secret');
    const expectedSecret = process.env.PABBAS_AI_WEBHOOK_SECRET;

    if (!expectedSecret || secretHeader !== expectedSecret) {
      // TEMPORARY DIAGNOSTIC PAYLOAD
      const envSecretExists = !!expectedSecret;
      const envSecretLength = expectedSecret ? expectedSecret.length : 0;
      const headerSecretExists = !!secretHeader;
      const headerSecretLength = secretHeader ? secretHeader.length : 0;
      const isExactMatch = expectedSecret === secretHeader;
      const isTrimmedMatch = expectedSecret?.trim() === secretHeader?.trim();

      return NextResponse.json({ 
        error: 'Unauthorized',
        _diagnostic: {
          envSecretExists,
          envSecretLength,
          headerSecretExists,
          headerSecretLength,
          isExactMatch,
          isTrimmedMatch
        }
      }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Try to find the existing customer by phone
    let { data: customer, error: fetchError } = await supabase
      .from('app_customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (fetchError) {
      console.error('[AI Tool: customer_lookup] Database error on fetch:', fetchError.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 2. If no customer exists, create a new stub record
    if (!customer) {
      const { data: newCustomer, error: insertError } = await supabase
        .from('app_customers')
        .insert({
          phone: phone,
          name: name || 'WhatsApp Customer',
          channel: 'whatsapp'
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[AI Tool: customer_lookup] Database error on insert:', insertError.message);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
      
      customer = newCustomer;
    }

    // 3. Generate a secure one-time session token for the CTA
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

    const { error: sessionError } = await supabase
      .from('ordering_sessions')
      .insert({
        customer_id: customer.id,
        channel: 'whatsapp',
        channel_user_id: phone,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
      });

    if (sessionError) {
      console.error('[AI Tool: customer_lookup] Failed to create ordering session:', sessionError.message);
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
    }

    // 4. Return the customer_id and the fully qualified CTA URL
    const ctaUrl = `https://pabbas.com/auth/whatsapp?token=${encodeURIComponent(rawToken)}`;
    
    return NextResponse.json({ 
      customer_id: customer.id,
      cta_url: ctaUrl
    });

  } catch (error) {
    console.error('[AI Tool: customer_lookup] Unhandled exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
