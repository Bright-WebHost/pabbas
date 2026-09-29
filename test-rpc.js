const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = 'https://clqzctntkwzahdfjeqlx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || 'MISSING_SECRET';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJpYXQiOjE3OTAwNjMxMDksImV4cCI6MjEwNTYzOTEwOX0.FE20KE6UeqQfDEWsargczPt8tsX1qWHDY6DQnCXJQzA';

async function testRPC() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('Creating test user...');
    const { data: userAuth, error: authErr } = await supabase.auth.admin.createUser({
        email: 'teststaff2@pabbas.com',
        password: 'TestPassword123!',
        email_confirm: true
    });
    const userId = userAuth?.user?.id;
    await supabase.from('staff_members').upsert({ email: 'teststaff2@pabbas.com', name: 'Test Staff 2' });

    console.log('Signing in to get JWT...');
    const clientAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: signInData } = await clientAuth.auth.signInWithPassword({
        email: 'teststaff2@pabbas.com',
        password: 'TestPassword123!'
    });
    const jwt = signInData.session.access_token;

    console.log('Testing RPC directly to see if it requires anon key as apikey...');
    // Test with service role key as apikey
    let res = await fetch(SUPABASE_URL + '/rest/v1/rpc/staff_check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + jwt
        }
    });
    console.log('With Service Role apikey:', await res.text());

    // Test with anon key as apikey
    res = await fetch(SUPABASE_URL + '/rest/v1/rpc/staff_check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + jwt
        }
    });
    console.log('With Anon Key apikey:', await res.text());

    // Cleanup
    if (userId) {
        await supabase.from('staff_members').delete().eq('email', 'teststaff2@pabbas.com');
        await supabase.auth.admin.deleteUser(userId);
    }
}
testRPC();
