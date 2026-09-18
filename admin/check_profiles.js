const https = require('https');

const url = 'https://xdbsuikweiqarwaxrmwf.supabase.co/rest/v1/profiles?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA2NjExMCwiZXhwIjoyMTA0NjQyMTEwfQ.1MMUD57LAua7kqipWof6oO0IY6FdZrWHqrmBNZFKG5U';

const options = {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const profiles = JSON.parse(data);
    console.log('Profiles in DB:');
    profiles.forEach(p => console.log(`- ID: ${p.id}\n  Name: ${p.full_name}\n  Role: ${p.role}\n  PushToken: ${p.push_token}\n`));
  });
}).on('error', err => console.log('Error: ', err.message));
