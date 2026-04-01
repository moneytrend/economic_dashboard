const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3456;
const FRED_KEY = 'abf0f4764ba9e3e250d27364004f5d78';
const FRED_HOST = 'api.stlouisfed.org';

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

function fredProxy(reqUrl, res) {
  // reqUrl like: /api/fred?endpoint=series/observations&series_id=GDPC1&...
  const parsed = url.parse(reqUrl, true);
  const { endpoint = '', ...restQuery } = parsed.query;
  const qs = new URLSearchParams(restQuery);
  qs.set('api_key', FRED_KEY);
  qs.set('file_type', 'json');
  const fullPath = `/fred/${endpoint}?${qs.toString()}`;

  const options = {
    hostname: FRED_HOST,
    path: fullPath,
    method: 'GET',
    headers: { 'User-Agent': 'EconDashboard/1.0' },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' });
    res.end();
    return;
  }

  // FRED proxy
  if (pathname === '/api/fred') {
    fredProxy(req.url, res);
    return;
  }

  // Static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);

  if (!ext) filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Economic Dashboard running at http://localhost:${PORT}`);
});
