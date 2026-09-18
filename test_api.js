const http = require('http');

const data = JSON.stringify({
  name: 'Ahmet Yilmaz',
  phone: '05556667788',
  date: '2026-10-16',
  time: '14:00',
  service: 'Sakal Şekillendirme',
  notes: 'Test note'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/web-appointment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  console.log(`Status: ${res.statusCode}`);
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(`Body: ${body}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
