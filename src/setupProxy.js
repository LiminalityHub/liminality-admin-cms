/**
 * Dev-server proxy: fetches an external URL server-side so the browser
 * never makes a cross-origin request (avoids CORS + extension blocking).
 *
 * CRA picks this file up automatically — no config needed.
 */
const https = require('https');
const http = require('http');

function get(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return get(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timed out')); });
  });
}

module.exports = function (app) {
  app.get('/api/fetch-url', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Missing ?url= parameter' });

    try {
      const body = await get(targetUrl);
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.send(body);
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });
};
