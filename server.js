const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 3000;

// Dummy data for download test (10 MB)
const DOWNLOAD_SIZE = 10 * 1024 * 1024;
const dummyData = Buffer.alloc(DOWNLOAD_SIZE, 'x');

// ── Map file extensions to MIME types ──
// This tells the browser what kind of file it's receiving
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
};

const server = http.createServer((req, res) => {

  // Allow any origin (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = url.parse(req.url).pathname;

  // ── Serve static files: index.html, style.css, app.js ──
  // Any GET request for a known static file gets served from disk
  const staticFiles = ['/', '/index.html', '/style.css', '/app.js'];

  if (req.method === 'GET' && staticFiles.includes(pathname)) {
    // "/" maps to index.html
    const fileName = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = path.join(__dirname, fileName);
    const ext      = path.extname(fileName);

    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('File not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
      res.end(data);
    });
    return;
  }

  // ── Ping ──
  if (req.method === 'GET' && pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  // ── Download test ──
  if (req.method === 'GET' && pathname === '/download') {
    res.writeHead(200, {
      'Content-Type':   'application/octet-stream',
      'Content-Length': DOWNLOAD_SIZE,
      'Cache-Control':  'no-store'
    });
    res.end(dummyData);
    return;
  }

  // ── Upload test ──
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
