const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

// Render sets PORT automatically via environment variable
// If running locally, fallback to 3000
const PORT = process.env.PORT || 3000;

const DOWNLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const dummyData = Buffer.alloc(DOWNLOAD_SIZE, 'x');

const server = http.createServer((req, res) => {

  // Allow requests from ANY origin (needed for browser to talk to our server)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = url.parse(req.url).pathname;

  // Serve HTML page
  if (req.method === 'GET' && pathname === '/') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Ping
  if (req.method === 'GET' && pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  // Download
  if (req.method === 'GET' && pathname === '/download') {
    res.writeHead(200, {
      'Content-Type':   'application/octet-stream',
      'Content-Length': DOWNLOAD_SIZE,
      'Cache-Control':  'no-store'
    });
    res.end(dummyData);
    return;
  }

  // Upload
  if (req.method === 'POST' && pathname === '/upload') {
    let received = 0;
    req.on('data', chunk => { received += chunk.length; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
