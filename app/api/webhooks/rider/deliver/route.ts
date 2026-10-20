import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isInternalRequest } from '@/lib/server/internal-auth';
import { notifyStatusWebhook } from "@/lib/server/notify";

async function notifyRider(phone: string, text: string) {
  const apiKey = process.env.YCLOUD_API_KEY;
  if (!apiKey) return;
  const to = String(phone || '').replace(/[^0-9]/g, '');
  try {
    const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ from: '+919180348124', to: `+${to}`, type: 'text', text: { body: text } }),
    });
    if (!res.ok) console.error('[RIDER DELIVER] rider confirmation failed:', res.status);
  } catch (err) {
    console.error('[RIDER DELIVER] rider confirmation error', err);
  }
}

export async function POST(request: Request) {
  // Only the YCloud webhook route calls this (rider tapped "Delivered").
  if (!isInternalRequest(request)) {
    console.error("[RIDER DELIVER] Unauthorized request");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { order_number, rider_phone, payment_status } = body;

    if (!order_number || !rider_phone) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch existing order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, status, is_collected, total, rider_phone, customer_phone, customer_name, items_json, order_type')
      .eq('order_number', order_number)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const dbPhone = (order.rider_phone || '').replace(/[^0-9]/g, '');
    const incomingPhone = (rider_phone || '').replace(/[^0-9]/g, '');
    
    if (dbPhone !== incomingPhone) {
      return NextResponse.json({ success: false, error: 'Order not assigned to you' }, { status: 403 });
    }

    if (order.status === 'delivered') {
      return NextResponse.json({ success: true, message: 'Already delivered' });
    }

    // "Collected": the rider holds the cash until the cashier collects it (is_collected stays false).
    // "Unpaid": the customer didn't pay the rider, so the rider owes nothing for this order and
    // the shop follows up with the customer (the Orders page flags it).
    const paymentStatus = payment_status === 'unpaid' ? 'unpaid' : 'collected';
    const updatePayload: Record<string, unknown> = {
      status: 'delivered',
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    // 2. Mark as delivered
    const { error: updateError } = await adminClient
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id);

    if (updateError) throw updateError;

    // Tell the rider their tap was recorded (they got no reply before).
    const amount = `₹${Math.round(Number(order.total) || 0).toLocaleString('en-IN')}`;
    await notifyRider(
      rider_phone,
      paymentStatus === 'unpaid'
        ? `⚠️ Order ${order_number} delivered and marked *UNPAID* (${amount}).

You don't need to hand over cash for this order. The restaurant will follow up with the customer.`
        : `✅ Order ${order_number} delivered. Cash collected: *${amount}*.

Please hand it over at the counter. Thank you! 🙏`
    );

    // 3. Notify webhook
    const customMessage = `Your order ${order.order_number} has been delivered! 🎉\n\nHere is your receipt. Thank you for choosing Pabbas! We hope you enjoy your meal. 😋`;
    const itemsArr = Array.isArray(order.items_json) ? order.items_json : [];

    await notifyStatusWebhook(order_number, 'delivered', undefined, {
      total: order.total,
      order_type: order.order_type,
      customer_name: order.customer_name || "Guest",
      customer_phone: order.customer_phone,
      custom_message: customMessage,
      whatsapp_message_text: customMessage,
      items: itemsArr.map((item: any) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    });

    return NextResponse.json({ success: true, message: 'Order marked as delivered' });

  } catch (error: any) {
    console.error('Error marking delivered:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
