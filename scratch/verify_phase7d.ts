import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function runTests() {
  console.log('=== Pabbas Phase 7D Verification ===\n');

  // Helper function to create a dummy event via create_customer_order
  async function createDummyOrderEvent(orderType: string = 'delivery') {
    // Requires a valid customer
    const { data: customerData } = await supabase.from('app_customers').select('id, name, phone').limit(1).single();
    if (!customerData) throw new Error('No customer found to create order');

    // Requires a valid menu item
    const { data: menuData } = await supabase.from('menu_items').select('id').eq('is_active', true).limit(1).single();
    if (!menuData) throw new Error('No menu items found');

    const { data, error } = await supabase.rpc('create_customer_order', {
      p_customer_id: customerData.id,
      p_order_type: orderType,
      p_customer_name: customerData.name,
      p_customer_phone: customerData.phone,
      p_delivery_address: 'Test Address',
      p_landmark: null,
      p_pincode: null,
      p_scheduled_time: null,
      p_payment_method: 'upi',
      p_idempotency_key: `test-${Date.now()}-${Math.random()}`,
      p_cart_items: [{ menu_item_id: menuData.id, quantity: 1 }],
      p_table_id: null,
      p_party_size: 1,
    });

    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return data.event_id;
  }

  try {
    // 1. Existing Stale Processing Recovery & Pending Recovery
    console.log('[Test 1] Polling for events (should return any stale/pending events)...');
    const { data: pollData, error: pollError } = await supabase.rpc('poll_order_events', { p_limit: 10 });
    if (pollError) throw pollError;
    console.log(`✓ poll_order_events returned ${pollData.length} eligible events.`);

    if (pollData.length > 0) {
      console.log('Attempting to claim the first eligible event (could be legacy stale or new)...');
      const testEventId = pollData[0].event_id;
      
      const { data: claimData, error: claimError } = await supabase.rpc('claim_order_event', { p_event_id: testEventId });
      if (claimError) throw claimError;
      
      if (!claimData) {
        console.log(`✗ Event ${testEventId} could not be claimed. Concurrency lock worked?`);
      } else {
        console.log(`✓ Event ${testEventId} claimed successfully.`);
        console.log(`  - Status: ${claimData.status}`);
        console.log(`  - Locked Until: ${claimData.locked_until}`);

        // Verify concurrent claim fails
        console.log('\n[Test 2] Concurrent claim test...');
        const { data: concurrentData } = await supabase.rpc('claim_order_event', { p_event_id: testEventId });
        if (!concurrentData) {
          console.log(`✓ Concurrent claim correctly rejected (returned null) because lease is active.`);
        } else {
          throw new Error('Concurrent claim succeeded when it should have failed!');
        }

        // Complete the event
        console.log('\n[Test 3] Successful completion...');
        const { data: completeData, error: completeError } = await supabase.rpc('complete_order_event', { p_event_id: testEventId });
        if (completeError) throw completeError;
        console.log(`✓ Event ${testEventId} completed successfully.`);
        console.log(`  - Status: ${completeData.status}`);
        
        // Verify locked_until is cleared
        const { data: verifyComplete } = await supabase.from('order_events').select('locked_until').eq('id', testEventId).single();
        if (verifyComplete?.locked_until !== null) throw new Error('locked_until was not cleared on completion');
        console.log(`✓ locked_until was cleared successfully.`);
      }
    }

    // 2. Failure & Retry Logic
    console.log('\n[Test 4] Failure / Retry / Dead Letter...');
    const failEventId = await createDummyOrderEvent('pickup');
    console.log(`Created new dummy event for failure test: ${failEventId}`);
    
    // Claim it
    await supabase.rpc('claim_order_event', { p_event_id: failEventId });
    
    // Fail it once
    const { data: fail1, error: fError1 } = await supabase.rpc('fail_order_event', { p_event_id: failEventId, p_error: 'Simulated failure 1' });
    if (fError1) throw fError1;
    console.log(`✓ Failed event once. Status: ${fail1.status}, Retry Count: ${fail1.retry_count}, Next Retry: ${fail1.next_retry_at}`);
    
    // Verify locked_until is cleared
    const { data: verifyFail } = await supabase.from('order_events').select('locked_until').eq('id', failEventId).single();
    if (verifyFail?.locked_until !== null) throw new Error('locked_until was not cleared on failure');
    
    // Force retry count to max to test dead_letter
    await supabase.from('order_events').update({ retry_count: fail1.max_retries - 1, next_retry_at: new Date().toISOString(), status: 'failed' }).eq('id', failEventId);
    
    // Claim again
    await supabase.rpc('claim_order_event', { p_event_id: failEventId });
    
    // Fail again
    const { data: failDead, error: fErrorDead } = await supabase.rpc('fail_order_event', { p_event_id: failEventId, p_error: 'Simulated dead letter' });
    if (fErrorDead) throw fErrorDead;
    console.log(`✓ Failed event at max retries. Status: ${failDead.status}, Retry Count: ${failDead.retry_count}, Next Retry: ${failDead.next_retry_at}`);
    
    if (failDead.status !== 'dead_letter') throw new Error('Event should be dead_letter');

    console.log('\n=== All 7D Verification Tests Passed ===');
  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message || error);
    process.exit(1);
  }
}

runTests();
