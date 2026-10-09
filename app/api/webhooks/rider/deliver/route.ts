import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyStatusWebhook } from "@/lib/server/notify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, rider_id } = body;

    if (!order_id || !rider_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch existing order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, status, is_collected, total')
      .eq('id', order_id)
      .eq('rider_id', rider_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found or not assigned to you' }, { status: 404 });
    }

    if (order.status === 'delivered') {
      return NextResponse.json({ success: true, message: 'Already delivered' });
    }

    // PHASE 4: Prevent stealing
    // Check if cash needs to be collected first
    if (!order.is_collected && order.total > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Counter must collect cash first' 
      }, { status: 403 });
    }

    // 2. Mark as delivered
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) throw updateError;

    // 3. Notify webhook
    await notifyStatusWebhook(order_id, 'delivered');

    return NextResponse.json({ success: true, message: 'Order marked as delivered' });

  } catch (error: any) {
    console.error('Error marking delivered:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
