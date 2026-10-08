import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyStatusWebhook } from '@/app/(dashboard)/dashboard/(main)/orders/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_number, rider_phone } = body;

    if (!order_number || !rider_phone) {
      return NextResponse.json({ success: false, error: "Missing order_number or rider_phone" }, { status: 400 });
    }

    const expectedSecret = process.env.PABBAS_WHATSAPP_INBOUND_SECRET || process.env.PABBAS_AI_WEBHOOK_SECRET || process.env.PABBAS_N8N_WEBHOOK_SECRET || "";
    const secretHeader = request.headers.get('x-pabbas-whatsapp-secret')?.trim();

    if (expectedSecret && secretHeader !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Verify order exists and is a delivery order
    const adminClient = createAdminClient();
    const { data: order, error: fetchError } = await adminClient
      .from("orders")
      .select("id, order_number, status, order_type, rider_id, rider_phone, rider_name, total")
      .eq("order_number", order_number)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.order_type !== "delivery") {
      return NextResponse.json({ success: false, error: "Not a delivery order" }, { status: 400 });
    }

    // 2. Verify order is currently ready_for_pickup or preparing (meaning it hasn't been accepted or delivered yet)
    if (order.status !== "ready_for_pickup" && order.status !== "preparing") {
      return NextResponse.json({ success: false, error: `Order cannot be accepted from state: ${order.status}` }, { status: 400 });
    }

    // 3. Verify a rider is assigned
    if (!order.rider_id || !order.rider_phone) {
      return NextResponse.json({ success: false, error: "No rider assigned to this order" }, { status: 400 });
    }

    // 4. Verify incoming rider identity matches the assigned rider
    if (order.rider_phone !== rider_phone) {
      return NextResponse.json({ success: false, error: "Rider identity mismatch" }, { status: 403 });
    }

    // 5. Concurrency-safe status transition
    const { data: updatedOrder, error: updateError } = await adminClient
      .from("orders")
      .update({ status: "out_for_delivery", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .in("status", ["preparing", "ready_for_pickup"])
      .select()
      .single();

    if (updateError || !updatedOrder) {
      return NextResponse.json({ success: false, error: "Failed to accept order. It may have already been accepted or modified." }, { status: 409 });
    }

    // 5.5 Increment deliveries_count on the rider
    const { data: rider, error: fetchRiderError } = await adminClient
      .from("riders")
      .select("deliveries_count")
      .eq("id", order.rider_id)
      .single();

    if (!fetchRiderError && rider) {
      await adminClient
        .from("riders")
        .update({ deliveries_count: (rider.deliveries_count || 0) + 1 })
        .eq("id", order.rider_id);
    }

    // 6. Trigger customer notification
    const customMessage = `Good news! Your order ${order.order_number} is on its way. 🛵\n\nYour delivery partner, ${order.rider_name} (📞 ${order.rider_phone}), will be arriving soon.\n\nPlease keep ₹${order.total} in cash ready for the delivery.\n\nThank you for choosing Pabbas! We hope you enjoy your meal. 😋`;

    const notifyResult = await notifyStatusWebhook(order.order_number, "out_for_delivery", undefined, {
      total: order.total,
      rider_name: order.rider_name,
      rider_phone: order.rider_phone,
      custom_message: customMessage,
      whatsapp_message_text: customMessage
    });

    if (!notifyResult.success) {
      console.error(`Customer notification failed after rider acceptance for ${order.order_number}`, notifyResult.error);
      // We still return success: true to the rider because the order state transitioned successfully
    }

    return NextResponse.json({ 
      success: true, 
      message: `Order ${order.order_number} successfully accepted for delivery.` 
    });

  } catch (err: any) {
    console.error("Rider Accept Error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
