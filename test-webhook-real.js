const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://clqzctntkwzahdfjeqlx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || 'MISSING_SECRET';
const WEBHOOK_URL = 'https://staff.brightmedia.tech/webhook/pabbas-status';
const WEBHOOK_SECRET = 'pabbas_wh_sec_9f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runTest() {
    console.log('Creating test user...');
    const { data: userAuth, error: authErr } = await supabase.auth.admin.createUser({
        email: 'teststaff3@pabbas.com',
        password: 'TestPassword123!',
        email_confirm: true
    });
    const userId = userAuth?.user?.id;
    await supabase.from('staff_members').upsert({ email: 'teststaff3@pabbas.com', name: 'Test Staff 3' });

    console.log('Signing in to get JWT...');
    const clientAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: signInData } = await clientAuth.auth.signInWithPassword({
        email: 'teststaff3@pabbas.com',
        password: 'TestPassword123!'
    });
    const jwt = signInData.session.access_token;

    console.log('Got JWT. Sending webhook...');
    
    const body = { order_number: 'PBN-P-1011', status: 'preparing' };
    const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + jwt,
            'x-pabbas-whatsapp-secret': WEBHOOK_SECRET
        },
        body: JSON.stringify(body)
    });
    
    console.log('Webhook status:', res.status);
    console.log('Webhook response:', await res.text());
    
    // Cleanup
    if (userId) {
        console.log('Cleaning up user...');
        await supabase.from('staff_members').delete().eq('email', 'teststaff3@pabbas.com');
        await supabase.auth.admin.deleteUser(userId);
    }
}
runTest();
