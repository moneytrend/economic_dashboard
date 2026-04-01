// Vercel Serverless Function — FRED API Proxy
// Handles: /api/fred/series/observations, /api/fred/releases/dates, etc.
const https = require('https');

const FRED_KEY = 'abf0f4764ba9e3e250d27364004f5d78';

module.exports = function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Build FRED endpoint path from catch-all segments
  const segments = req.query.path;
  const fredPath = Array.isArray(segments)
    ? segments.join('/')
    : (segments || '');

  // Forward all query params except the internal 'path' key
  const params = { ...req.query };
  delete params.path;
  params.api_key = FRED_KEY;
  params.file_type = 'json';

  const qs = new URLSearchParams(params).toString();
  const fredUrl = `https://api.stlouisfed.org/fred/${fredPath}?${qs}`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EconDashboard/1.0)',
      'Accept': 'application/json',
    },
  };

  const proxyReq = https.get(fredUrl, options, (proxyRes) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('FRED proxy error:', err.message);
    res.status(502).json({ error: err.message });
  });

  proxyReq.end();
};
