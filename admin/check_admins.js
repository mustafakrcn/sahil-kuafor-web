const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkAdmins() {
  const { data: authData } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase.from('profiles').select('*');
  
  console.log('--- ALL USERS ---');
  authData.users.forEach(user => {
    const profile = profiles.find(p => p.id === user.id);
    console.log(`Email: ${user.email} | Role: ${profile?.role || 'NONE'}`);
  });
}
checkAdmins();
