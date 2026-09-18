const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xdbsuikweiqarwaxrmwf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA2NjExMCwiZXhwIjoyMTA0NjQyMTEwfQ.1MMUD57LAua7kqipWof6oO0IY6FdZrWHqrmBNZFKG5U';

const supabase = createClient(supabaseUrl, serviceKey);

async function makeAdmin(email) {
  console.log(`Checking user with email: ${email}`);
  
  // 1. Find user in auth.users
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Failed to fetch auth users:', authErr.message);
    return;
  }
  
  const user = authData.users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found in auth.users! Did they register?`);
    return;
  }
  
  console.log(`Found auth user ID: ${user.id}`);
  
  // 2. Upsert profile with role 'admin'
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: 'Mustafa Karaçin (Admin)',
      role: 'admin'
    }, { onConflict: 'id' })
    .select()
    .single();
    
  if (profErr) {
    console.error('Failed to upsert profile:', profErr.message);
  } else {
    console.log(`✅ Success! Updated profile role to Admin for: ${email}`);
    console.log(profile);
  }
}

makeAdmin('mustafakaracin190341@gmail.com');
