const URL = 'https://xdbsuikweiqarwaxrmwf.supabase.co/rest/v1/appointments?select=id,start_at,notes&order=created_at.desc&limit=3';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjYxMTAsImV4cCI6MjEwNDY0MjExMH0.J6-MZ-gYXxO2xAhA8GBs63t1-kEM73RjRyesCMYiotA';

fetch(URL, {
  headers: {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY
  }
}).then(r => r.json()).then(console.log);
