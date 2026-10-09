const fs = require('fs');

let file = 'app/(dashboard)/dashboard/(main)/orders/actions.ts';
let content = fs.readFileSync(file, 'utf8');

const target =     // 1. Update the order
    const { error: orderError } = await adminClient
      .from("orders")
      .update({
        collected_amount: receivedAmount,
        is_collected: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);;

const replacement =     // 1. Check if already collected and read exact values from DB
    const { data: order, error: fetchError } = await adminClient
      .from("orders")
      .select("is_collected, rider_id, total_amount, id")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      throw new Error("Order not found");
    }
    
    if (order.is_collected) {
      return { success: true }; // Idempotent success
    }

    // 2. Update the order
    const { error: orderError } = await adminClient
      .from("orders")
      .update({
        collected_amount: receivedAmount,
        is_collected: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId)
      .eq("is_collected", false); // Extra safety lock;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed collectCash');
