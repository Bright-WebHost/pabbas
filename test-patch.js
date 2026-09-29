const fetch = require('node-fetch');

const SUPABASE_URL = 'https://clqzctntkwzahdfjeqlx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || 'MISSING_SECRET';

async function testUpdate() {
    const res = await fetch(SUPABASE_URL + '/rest/v1/orders?order_number=eq.PBN-P-1011', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ status: 'preparing' })
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
}
testUpdate();
