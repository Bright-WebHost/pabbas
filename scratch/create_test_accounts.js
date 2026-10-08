const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function createTestAccounts() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
  const supabaseKey = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim(); // Service Role Key is required to create users bypass

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const accounts = [
    { email: 'kitchen@pabbas.com', password: 'password123', role: 'kitchen', name: 'Kitchen Staff' },
    { email: 'waiter@pabbas.com', password: 'password123', role: 'waiter', name: 'Waiter Staff' },
    { email: 'counter@pabbas.com', password: 'password123', role: 'counter', name: 'Counter Staff' }
  ];

  for (const acc of accounts) {
    console.log(`Creating ${acc.email}...`);
    
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true
    });

    if (authError && !authError.message.includes('already been registered')) {
      console.error('Error creating auth user:', authError);
      continue;
    }

    // 2. Insert into staff_members table
    const { error: dbError } = await supabase
      .from('staff_members')
      .upsert({
        email: acc.email,
        name: acc.name,
        role: acc.role
      }, { onConflict: 'email' });

    if (dbError) {
      console.error('Error adding to staff_members:', dbError);
    } else {
      console.log(`Successfully created test account: ${acc.email}`);
    }
  }
}

createTestAccounts().catch(console.error);
