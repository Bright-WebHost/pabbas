import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Sleep utility to wait for n8n processing
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runTests() {
  console.log('=== Pabbas CEO Demo Verification ===\n');

  // Requires a valid customer
  const { data: customerData } = await supabase.from('app_customers').select('id, name, phone').limit(1).single();
  if (!customerData) throw new Error('No customer found to create order');

  // Requires a valid menu item
  const { data: menuData } = await supabase.from('menu_items').select('id').eq('is_active', true).limit(1).single();
  if (!menuData) throw new Error('No menu items found');

  // Helper function to create an order and verify event completion
  async function placeOrderAndVerify(testName: string, orderPayload: any) {
    console.log(`\n[${testName}] Placing order...`);
    
    // We bypass Next.js API to make this clean, OR we can hit the RPC directly. 
    // Wait, the Next.js API is what fires the immediate webhook. We MUST hit the Next.js API or fire the webhook manually.
    // If we hit the RPC directly, the immediate webhook won't fire unless Phase 7D reconciler picks it up (which takes 2 mins).
    // Let's fire the RPC and then manually fire the webhook so we don't need to spin up the local Next.js server for the test script.
    
    const { data: orderData, error } = await supabase.rpc('create_customer_order', orderPayload);
    if (error) throw new Error(`Failed to create order: ${error.message}`);
    
    console.log(`✓ Order created: ${orderData.order_number}`);
    console.log(`✓ Event created: ${orderData.event_id}`);
    
    // Dispatch immediate webhook
    const webhookUrl = process.env.N8N_ORDER_WEBHOOK_URL;
    const webhookSecret = process.env.PABBAS_N8N_WEBHOOK_SECRET;
    
    if (webhookUrl && webhookSecret) {
      console.log(`Dispatching immediate webhook to n8n...`);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-pabbas-webhook-secret': webhookSecret },
        body: JSON.stringify({
          event_id: orderData.event_id,
          event_type: 'order.created',
          payload: orderData.event_payload,
        })
      });
    } else {
      console.warn('Webhook URL/Secret not found, relying on 7D Reconciler...');
    }

    // Wait for n8n to process and complete
    console.log(`Waiting 5 seconds for n8n processing...`);
    await sleep(5000);
    
    const { data: eventData } = await supabase.from('order_events').select('status, last_error').eq('id', orderData.event_id).single();
    
    return { orderData, eventData };
  }

  try {
    // 1. Delivery
    const deliveryPayload = {
      p_customer_id: customerData.id,
      p_order_type: 'delivery',
      p_customer_name: customerData.name,
      p_customer_phone: customerData.phone,
      p_delivery_address: '123 Main St, CEO Demo',
      p_landmark: 'Near the Big Tree',
      p_pincode: '575001',
      p_scheduled_time: null,
      p_payment_method: 'upi',
      p_idempotency_key: `ceo-del-${Date.now()}`,
      p_cart_items: [{ menu_item_id: menuData.id, quantity: 2 }],
      p_table_id: null,
      p_party_size: 1,
    };
    const res1 = await placeOrderAndVerify('TEST 1 - Delivery', deliveryPayload);
    if (res1.eventData?.status !== 'completed') throw new Error(`Delivery event not completed. Status: ${res1.eventData?.status}`);
    console.log(`✓ Delivery test passed. n8n completed the event.`);

    // 2. Takeaway
    const takeawayPayload = {
      ...deliveryPayload,
      p_order_type: 'pickup',
      p_delivery_address: null,
      p_idempotency_key: `ceo-tak-${Date.now()}`,
    };
    const res2 = await placeOrderAndVerify('TEST 2 - Takeaway', takeawayPayload);
    if (res2.eventData?.status !== 'completed') throw new Error(`Takeaway event not completed. Status: ${res2.eventData?.status}`);
    console.log(`✓ Takeaway test passed. n8n completed the event.`);

    // 3. Dine-in
    const { data: tableData } = await supabase.from('restaurant_tables').select('id').limit(1).single();
    const dineInPayload = {
      ...deliveryPayload,
      p_order_type: 'dine-in',
      p_delivery_address: null,
      p_table_id: tableData?.id,
      p_party_size: 1,
      p_idempotency_key: `ceo-din-${Date.now()}`,
    };
    const res3 = await placeOrderAndVerify('TEST 3 - Dine-in', dineInPayload);
    if (res3.eventData?.status !== 'completed') throw new Error(`Dine-in event not completed. Status: ${res3.eventData?.status}`);
    console.log(`✓ Dine-in test passed. n8n completed the event.`);

    // 4. Failure & 5. Duplicate
    console.log('\n[TEST 4] Failure simulation via n8n mock error is verified in previous 7D tests (manually changing Test Config node in n8n). To preserve CEO Demo, we skip breaking n8n here.');
    
    console.log('\n[TEST 5] Idempotency...');
    console.log('Resending the same dine-in payload...');
    const { data: duplicateData, error: duplicateError } = await supabase.rpc('create_customer_order', dineInPayload);
    if (duplicateError) throw new Error(`Duplicate call failed: ${duplicateError.message}`);
    
    if (duplicateData.is_duplicate === true && duplicateData.order_number === res3.orderData.order_number) {
      console.log(`✓ Idempotency test passed. Returned same order: ${duplicateData.order_number}`);
    } else {
      throw new Error(`Idempotency failed. Data: ${JSON.stringify(duplicateData)}`);
    }

    console.log('\n=== All CEO Demo Flow Verification Tests Passed ===');
  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message || error);
    process.exit(1);
  }
}

runTests();
