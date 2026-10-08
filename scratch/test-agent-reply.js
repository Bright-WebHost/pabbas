const { createClient } = require('@supabase/supabase-js');


const SUPABASE_URL = 'https://clqzctntkwzahdfjeqlx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || 'MISSING_SECRET';
const WEBHOOK_URL = 'https://staff.brightmedia.tech/webhook/pabbas-agent-reply';
const WEBHOOK_SECRET = 'pabbas_wh_sec_9f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a';

async function runTest() {
    console.log('Signing in to get JWT...');
    const clientAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let { data: signInData, error } = await clientAuth.auth.signInWithPassword({
        email: 'teststaff3@pabbas.com',
        password: 'TestPassword123!'
    });
    if(error) {
        console.log('Login failed, attempting to create user first...');
        await clientAuth.auth.admin.createUser({
            email: 'teststaff3@pabbas.com',
            password: 'TestPassword123!',
            email_confirm: true
        });
        await clientAuth.from('staff_members').upsert({ email: 'teststaff3@pabbas.com', name: 'Test Staff 3' });
        
        const { data: retryData } = await clientAuth.auth.signInWithPassword({
            email: 'teststaff3@pabbas.com',
            password: 'TestPassword123!'
        });
        signInData = retryData;
    }
    const jwt = signInData.session.access_token;
    console.log('Got JWT. Sending webhook...');
    
    const body = { phone: '+919035960307', message: 'Pabbas agent reply test', agent_name: 'Maithri' };
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
}
runTest();
