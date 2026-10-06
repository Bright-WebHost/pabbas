import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyStatusWebhook } from '@/app/(dashboard)/dashboard/(main)/orders/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, table_number, new_items } = body;

    if (!order_id || !table_number || !new_items || !new_items.length) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch existing order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, items_json, total, status, order_number')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // 2. Merge items
    let existingItems = order.items_json || [];
    let updatedTotal = order.total;

    const mergedItems = [...existingItems];

    for (const newItem of new_items) {
      // Find if item already exists in the original order
      const existingIdx = mergedItems.findIndex((item: any) => 
        item.menu_item_id === newItem.menu_item_id && item.variant_name === newItem.variant_name
      );

      if (existingIdx >= 0) {
        // Increment quantity and flag as new addition
        mergedItems[existingIdx] = {
          ...mergedItems[existingIdx],
          old_quantity: mergedItems[existingIdx].old_quantity || mergedItems[existingIdx].quantity,
          quantity: mergedItems[existingIdx].quantity + newItem.quantity,
          is_new_addition: true
        };
      } else {
        // Add completely new item
        mergedItems.push({
          ...newItem,
          is_new_addition: true,
          old_quantity: 0
        });
      }

      updatedTotal += (newItem.price || newItem.unit_price) * newItem.quantity;
    }

    // Generate new items summary string
    const itemsSummary = mergedItems.map(item => `${item.quantity}x ${item.item_name}${item.variant_name ? ` (${item.variant_name})` : ''}`).join(', ');

    // 3. Determine new status
    let newStatus = order.status;
    if (['ready_for_pickup', 'out_for_delivery', 'delivered'].includes(order.status)) {
      newStatus = 'preparing';
    }

    // 4. Update the order
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        items_json: mergedItems,
        items: itemsSummary,
        total: updatedTotal,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) {
      throw updateError;
    }

    // Trigger webhook if we went back to preparing
    if (newStatus === 'preparing' && order.status !== 'preparing') {
      await notifyStatusWebhook(order.order_number, "preparing", undefined, { is_update: true });
    }

    return NextResponse.json({ success: true, new_total: updatedTotal, merged_items: mergedItems });

  } catch (error: any) {
    console.error('Append Order Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
