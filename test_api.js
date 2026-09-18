// Using native fetch

async function test() {
  try {
    const res = await fetch('https://admin-omega-eight-42.vercel.app/api/web-appointment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://barbershop-website-one.vercel.app'
      },
      body: JSON.stringify({
        name: 'Uctan Uca Test',
        phone: '05551234567',
        date: '2026-10-10',
        time: '14:00',
        service: 'Test'
      })
    });
    
    console.log("HTTP Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

test();
