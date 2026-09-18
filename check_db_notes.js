const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xdbsuikweiqarwaxrmwf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjYxMTAsImV4cCI6MjEwNDY0MjExMH0.J6-MZ-gYXxO2xAhA8GBs63t1-kEM73RjRyesCMYiotA'
);

async function checkNotes() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, start_at, status, notes')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Last 3 appointments:");
    console.log(data);
  }
}

checkNotes();
