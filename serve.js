const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/Pc/Desktop/barber.shop-website';
const mimes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  const fp = path.join(ROOT, url);
  try {
    const data = fs.readFileSync(fp);
    const ext = path.extname(fp);
    res.writeHead(200, {
      'Content-Type': mimes[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found: ' + url);
  }
}).listen(8080, () => {
  console.log('Web site HTTP server: http://localhost:8080');
});
