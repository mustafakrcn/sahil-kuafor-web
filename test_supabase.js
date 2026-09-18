const https = require('https');

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjYxMTAsImV4cCI6MjEwNDY0MjExMH0.J6-MZ-gYXxO2xAhA8GBs63t1-kEM73RjRyesCMYiotA';
const BASE = 'xdbsuikweiqarwaxrmwf.supabase.co';

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE,
      path,
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: 'application/json' }
    };
    https.get(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: BASE,
      path,
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Prefer: 'return=representation'
      }
    };
    const req = https.request(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('\n=== SUPABASE BAĞLANTI VE ŞEMA TESTİ ===\n');

  // 1. appointments tablosunu test et
  console.log('1. appointments tablosu kontrolü...');
  const appts = await get('/rest/v1/appointments?select=*&limit=1');
  console.log('   Status:', appts.status);
  if (appts.status === 200) {
    const rows = JSON.parse(appts.body);
    if (rows.length > 0) {
      console.log('   Kolonlar:', Object.keys(rows[0]).join(', '));
    } else {
      console.log('   (Tablo boş - kolonlar görülemiyor, ama bağlantı OK)');
    }
  } else {
    console.log('   HATA:', appts.body.substring(0, 300));
  }

  // 2. profiles tablosunu test et
  console.log('\n2. profiles tablosu kontrolü...');
  const profs = await get('/rest/v1/profiles?select=*&limit=1');
  console.log('   Status:', profs.status);
  if (profs.status === 200) {
    const rows = JSON.parse(profs.body);
    if (rows.length > 0) {
      console.log('   Kolonlar:', Object.keys(rows[0]).join(', '));
    } else {
      console.log('   (Tablo boş)');
    }
  } else {
    console.log('   HATA:', profs.body.substring(0, 300));
  }

  // 3. services tablosunu test et
  console.log('\n3. services tablosu kontrolü...');
  const svcs = await get('/rest/v1/services?select=*&limit=5');
  console.log('   Status:', svcs.status);
  if (svcs.status === 200) {
    const rows = JSON.parse(svcs.body);
    console.log('   Hizmet sayısı:', rows.length);
    rows.forEach(r => console.log('   -', r.name, '(₺' + r.price + ')'));
  } else {
    console.log('   HATA:', svcs.body.substring(0, 300));
  }

  // 4. INSERT testi - profiles
  console.log('\n4. profiles INSERT testi (anon)...');
  const profInsert = await post('/rest/v1/profiles', {
    full_name: 'Test Kullanici',
    phone: '05550000000',
    role: 'customer'
  });
  console.log('   Status:', profInsert.status);
  let testCustomerId = null;
  if (profInsert.status === 201 || profInsert.status === 200) {
    const row = JSON.parse(profInsert.body);
    const r = Array.isArray(row) ? row[0] : row;
    testCustomerId = r?.id;
    console.log('   ✅ Profil oluşturuldu! ID:', testCustomerId);
  } else {
    console.log('   ❌ HATA:', profInsert.body.substring(0, 400));
  }

  // 5. INSERT testi - appointments
  if (testCustomerId) {
    console.log('\n5. appointments INSERT testi (anon)...');
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 3);
    startAt.setHours(10, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);

    const apptInsert = await post('/rest/v1/appointments', {
      customer_id: testCustomerId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'pending',
      notes: '[TEST] Web form test randevusu'
    });
    console.log('   Status:', apptInsert.status);
    if (apptInsert.status === 201 || apptInsert.status === 200) {
      console.log('   ✅ Randevu oluşturuldu!');
      const row = JSON.parse(apptInsert.body);
      const r = Array.isArray(row) ? row[0] : row;
      console.log('   ID:', r?.id, '| Status:', r?.status);
    } else {
      console.log('   ❌ HATA:', apptInsert.body.substring(0, 600));
    }
  }

  console.log('\n=== TEST TAMAMLANDI ===\n');
}

main().catch(console.error);
