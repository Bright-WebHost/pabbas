const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/dashboard/(main)/tables/actions.ts', 'utf8');

const newFunctions = `
export async function moveTable(orderId: string, oldTableNumber: string, newTableNumber: string) {
  try {
    const adminClient = createAdminClient();
    
    // Check if new table has an active order
    const { data: activeOrder } = await adminClient
      .from('orders')
      .select('id')
      .eq('table_number', newTableNumber)
      .eq('order_type', 'dine-in')
      .in('status', ['new', 'preparing', 'ready_for_pickup'])
      .single();
      
    if (activeOrder) return { success: false, error: 'Destination table is already occupied.' };
    
    // Update order
    const { error: orderError } = await adminClient
      .from('orders')
      .update({ table_number: newTableNumber })
      .eq('id', orderId);
      
    if (orderError) throw orderError;
    
    // Update tables tracking
    await adminClient.from('restaurant_tables').update({ is_active: false, current_order_id: null }).eq('table_number', oldTableNumber);
    await adminClient.from('restaurant_tables').update({ is_active: true, current_order_id: orderId }).eq('table_number', newTableNumber);
    
    return { success: true };
  } catch (error: any) {
    console.error('[moveTable] Error:', error);
    return { success: false, error: 'Failed to move table' };
  }
}

export async function mergeTables(sourceOrderId: string, targetOrderId: string, sourceTableNumber: string) {
  try {
    const adminClient = createAdminClient();
    
    // Fetch both orders
    const { data: sourceOrder } = await adminClient.from('orders').select('items_json, total').eq('id', sourceOrderId).single();
    const { data: targetOrder } = await adminClient.from('orders').select('items_json, total, status, order_number').eq('id', targetOrderId).single();
    
    if (!sourceOrder || !targetOrder) return { success: false, error: 'Order not found' };
    
    let existingTargetItems = targetOrder.items_json || [];
    let sourceItems = sourceOrder.items_json || [];
    
    const currentMaxRound = existingTargetItems.reduce((max: number, item: any) => Math.max(max, item.round || 1), 0);
    const nextRound = currentMaxRound + 1;
    
    const mergedItems = [...existingTargetItems];
    for (const item of sourceItems) {
      mergedItems.push({
        ...item,
        is_new_addition: true,
        round: nextRound
      });
    }
    
    const newTotal = targetOrder.total + sourceOrder.total;
    
    const summaryMap = new Map<string, number>();
    for (const item of mergedItems) {
      const key = \`\${item.item_name}\${item.variant_name ? \` (\${item.variant_name})\` : ''}\`;
      summaryMap.set(key, (summaryMap.get(key) || 0) + item.quantity);
    }
    const itemsSummary = Array.from(summaryMap.entries()).map(([name, qty]) => \`\${qty}x \${name}\`).join(', ');
    
    let newStatus = targetOrder.status;
    if (['ready_for_pickup', 'out_for_delivery', 'delivered'].includes(targetOrder.status)) {
      newStatus = 'preparing';
    }
    
    // Update Target Order
    await adminClient.from('orders').update({
      items_json: mergedItems,
      items: itemsSummary,
      total: newTotal,
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', targetOrderId);
    
    // Mark Source Order as cancelled to remove from active
    await adminClient.from('orders').update({ status: 'cancelled' }).eq('id', sourceOrderId);
    
    // Clear the source table
    await adminClient.from('restaurant_tables').update({ is_active: false, current_order_id: null }).eq('table_number', sourceTableNumber);
    
    // Notify webhook for target order
    if (newStatus === 'preparing' && targetOrder.status !== 'preparing') {
      const { notifyStatusWebhook } = await import('@/app/(dashboard)/dashboard/(main)/orders/actions');
      await notifyStatusWebhook(targetOrder.order_number, 'preparing', undefined, { is_update: true });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[mergeTables] Error:', error);
    return { success: false, error: 'Failed to merge tables' };
  }
}
`;

fs.writeFileSync('app/(dashboard)/dashboard/(main)/tables/actions.ts', code + '\n' + newFunctions);
