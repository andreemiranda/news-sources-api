/**
 * server.js - Servidor Node.js (Express + Next.js) com suporte a SEO, arquivos estáticos na raiz,
 * páginas institucionais/legais, Banner LGPD e Google AdSense (somente Anúncios Automáticos)
 * via variável de ambiente/secret exclusivamente nas páginas de frontend fora da API.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV !== 'production';

const ADSENSE_ENV_KEYS = [
  'GOOGLE_ADSENSE_ID',
  'NEXT_PUBLIC_GOOGLE_ADSENSE_ID',
  'ADSENSE_ID',
  'NEXT_PUBLIC_ADSENSE_ID',
  'GOOGLE_ADSENSE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID',
];

const INVALID_VALUES = new Set([
  '',
  'default',
  'null',
  'undefined',
  'none',
  'auto',
  'false',
  '0',
  '/',
  'ca-pub-xxxxxxxxxxxxxxxx',
  'pub-xxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxx',
]);

function normalizeAdSenseClientId(rawValue) {
  if (!rawValue) return null;
  const trimmed = String(rawValue).trim();
  if (!trimmed || INVALID_VALUES.has(trimmed.toLowerCase())) return null;
  if (/^ca-pub-\d{10,20}$/i.test(trimmed)) return `ca-pub-${trimmed.slice(7)}`;
  if (/^pub-\d{10,20}$/i.test(trimmed)) return `ca-${trimmed.toLowerCase()}`;
  if (/^\d{10,20}$/.test(trimmed)) return `ca-pub-${trimmed}`;
  return null;
}

function resolveAdSenseClientId() {
  for (const key of ADSENSE_ENV_KEYS) {
    const normalized = normalizeAdSenseClientId(process.env[key]);
    if (normalized) return normalized;
  }
  return null;
}

function buildAdSenseHeadSnippet(clientId) {
  const normalized = normalizeAdSenseClientId(clientId);
  if (!normalized) return '';
  return (
    `<meta name="google-adsense-account" content="${normalized}" />` +
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${normalized}" crossorigin="anonymous"></script>`
  );
}

function getRequestBaseUrl(req) {
  const envUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '').trim();
  if (
    envUrl &&
    envUrl !== '/' &&
    !envUrl.startsWith('/') &&
    !INVALID_VALUES.has(envUrl.toLowerCase()) &&
    /^https?:\/\//i.test(envUrl)
  ) {
    return envUrl.replace(/\/+$/, '');
  }
  const protoHeader = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  const proto = protoHeader || 'http';
  return hostHeader ? `${proto}://${hostHeader}` : '';
}

function isFrontendHtmlEligiblePath(reqPath) {
  if (!reqPath) return false;
  if (reqPath === '/api' || reqPath.startsWith('/api/')) return false;
  if (reqPath.startsWith('/_next/')) return false;
  if (reqPath === '/ads.txt' || reqPath === '/robots.txt' || reqPath === '/sitemap.xml') return false;
  if (/\.(js|css|json|xml|txt|ico|svg|png|jpg|jpeg|webp|woff2?|map)$/i.test(reqPath)) return false;
  return true;
}

/**
 * Middleware Express que disponibiliza e injeta dinamicamente no <head> das páginas
 * de frontend (fora da API) o snippet global de Anúncios Automáticos do Google AdSense.
 */
function adsenseFrontendMiddleware(req, res, nextMiddleware) {
  if (!isFrontendHtmlEligiblePath(req.path)) {
    return nextMiddleware();
  }

  const clientId = resolveAdSenseClientId();
  const snippet = buildAdSenseHeadSnippet(clientId);
  res.locals.adsenseClientId = clientId;
  res.locals.adsenseSnippet = snippet;

  if (!snippet) {
    return nextMiddleware();
  }

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const chunks = [];
  let interceptHtml = null;

  const shouldIntercept = () => {
    if (interceptHtml !== null) return interceptHtml;
    const contentType = String(res.getHeader('content-type') || '').toLowerCase();
    const contentEncoding = String(res.getHeader('content-encoding') || '').trim();
    interceptHtml = contentType.includes('text/html') && !contentEncoding;
    return interceptHtml;
  };

  res.write = function patchedWrite(chunk, encoding, callback) {
    if (shouldIntercept()) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
      }
      if (typeof encoding === 'function') encoding();
      else if (typeof callback === 'function') callback();
      return true;
    }
    return originalWrite(chunk, encoding, callback);
  };

  res.end = function patchedEnd(chunk, encoding, callback) {
    if (shouldIntercept()) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
      }
      let html = Buffer.concat(chunks).toString('utf8');
      if (
        html.includes('</head>') &&
        !html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')
      ) {
        html = html.replace('</head>', `  ${snippet}\n</head>`);
        res.removeHeader('content-length');
      }
      return originalEnd(html, 'utf8', typeof encoding === 'function' ? encoding : callback);
    }
    return originalEnd(chunk, encoding, callback);
  };

  return nextMiddleware();
}

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    const app = express();
    const publicDir = path.join(__dirname, 'public');

    // 1. Rotas dinâmicas na raiz (/) com fallback para os arquivos estáticos em public/
    app.get('/ads.txt', (req, res) => {
      const clientId = resolveAdSenseClientId();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (clientId) {
        const pubId = clientId.replace(/^ca-/i, '');
        return res.status(200).send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
      }
      const staticFile = path.join(publicDir, 'ads.txt');
      if (fs.existsSync(staticFile)) {
        return res.sendFile(staticFile);
      }
      return res.status(200).send('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
    });

    app.get('/robots.txt', (req, res) => {
      const baseUrl = getRequestBaseUrl(req);
      const sitemapUrl = baseUrl ? `${baseUrl}/sitemap.xml` : '/sitemap.xml';
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(
        [
          'User-agent: Mediapartners-Google',
          'Allow: /',
          '',
          'User-agent: Googlebot',
          'Allow: /',
          'Disallow: /api/',
          '',
          'User-agent: *',
          'Allow: /',
          'Disallow: /api/',
          '',
          `Sitemap: ${sitemapUrl}`,
          '',
        ].join('\n')
      );
    });

    app.get('/sitemap.xml', (req, res) => {
      const baseUrl = getRequestBaseUrl(req);
      const lastMod = new Date().toISOString().split('T')[0];
      const pages = [
        { path: '/', changefreq: 'daily', priority: '1.0' },
        { path: '/docs', changefreq: 'weekly', priority: '0.8' },
        { path: '/sobre', changefreq: 'monthly', priority: '0.7' },
        { path: '/contato', changefreq: 'monthly', priority: '0.7' },
        { path: '/politica-de-privacidade', changefreq: 'monthly', priority: '0.6' },
        { path: '/termos-de-uso', changefreq: 'monthly', priority: '0.6' },
      ];
      const urls = pages
        .map(
          (p) =>
            `  <url>\n    <loc>${baseUrl ? `${baseUrl}${p.path}` : p.path}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
        )
        .join('\n');

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      );
    });

    // 2. Servir arquivos estáticos da pasta public/ na raiz (/)
    app.use(express.static(publicDir, { maxAge: '1d' }));

    // 3. Middleware dinâmico do Google AdSense (somente Anúncios Automáticos, somente fora da API)
    app.use(adsenseFrontendMiddleware);

    // 4. Todas as rotas de páginas (/ , /docs , /politica-de-privacidade , /termos-de-uso , /contato , /sobre) e /api/* via Next.js
    app.all(/.*/, (req, res) => handle(req, res));

    const server = http.createServer(app);

    server.listen(port, hostname, (err) => {
      if (err) {
        console.error('Failed to bind server to port', port, err);
        process.exit(1);
      }
      console.log(`> Express + Next.js server ready on http://${hostname}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Error preparing Next.js application:', err);
    process.exit(1);
  });
