// Vercel Serverless Function — FRED API Proxy
// Browser calls: /api/fred?endpoint=series/observations&series_id=GDPC1&...
const https = require('https');

const FRED_KEY = 'abf0f4764ba9e3e250d27364004f5d78';

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extract the FRED endpoint path and forward remaining query params
  const { endpoint = '', ...params } = req.query;
  params.api_key = FRED_KEY;
  params.file_type = 'json';

  const qs = new URLSearchParams(params).toString();
  const fredUrl = `https://api.stlouisfed.org/fred/${endpoint}?${qs}`;

  console.log('Proxying to:', fredUrl.replace(FRED_KEY, '***'));

  const proxyReq = https.get(fredUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EconDashboard/1.0)',
      'Accept': 'application/json',
    },
  }, (proxyRes) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('FRED proxy error:', err.message);
    res.status(502).json({ error: err.message });
  });

  proxyReq.end();
};
