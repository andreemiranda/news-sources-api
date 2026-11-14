const ADSENSE_ENV_KEYS = [
  'GOOGLE_ADSENSE_ID',
  'NEXT_PUBLIC_GOOGLE_ADSENSE_ID',
  'ADSENSE_ID',
  'NEXT_PUBLIC_ADSENSE_ID',
  'GOOGLE_ADSENSE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID',
] as const;

const INVALID_PLACEHOLDERS = new Set([
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

/**
 * Normalizes a Google AdSense publisher ID into canonical `ca-pub-<digits>` format.
 * Returns null if empty, placeholder, or invalid (prevents unsafe script attribute injection).
 */
export function normalizeAdSenseClientId(rawValue?: string | null): string | null {
  if (!rawValue) return null;
  const trimmed = String(rawValue).trim();
  if (!trimmed || INVALID_PLACEHOLDERS.has(trimmed.toLowerCase())) {
    return null;
  }

  if (/^ca-pub-\d{10,20}$/i.test(trimmed)) {
    return `ca-pub-${trimmed.slice(7)}`;
  }
  if (/^pub-\d{10,20}$/i.test(trimmed)) {
    return `ca-${trimmed.toLowerCase()}`;
  }
  if (/^\d{10,20}$/.test(trimmed)) {
    return `ca-pub-${trimmed}`;
  }

  return null;
}

/**
 * Extracts `pub-<digits>` for ads.txt from a normalized or raw client ID.
 * Falls back to Google's standard placeholder `pub-0000000000000000` if unconfigured.
 */
export function extractAdSensePublisherId(rawValue?: string | null): string {
  const normalized = normalizeAdSenseClientId(rawValue);
  if (!normalized) {
    return 'pub-0000000000000000';
  }
  return normalized.replace(/^ca-/i, '');
}

/**
 * Resolves the Google AdSense Auto Ads client ID from environment variables
 * (supports Next.js Node runtime, Cloudflare Workers env binding, and globalThis.env).
 */
export function resolveAdSenseClientId(envObj?: Record<string, unknown> | null): string | null {
  const candidates: Array<unknown> = [];

  if (envObj && typeof envObj === 'object') {
    for (let i = 0; i < ADSENSE_ENV_KEYS.length; i++) {
      const key = ADSENSE_ENV_KEYS[i];
      if (key in envObj) candidates.push(envObj[key]);
    }
  }

  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as any).env &&
    typeof (globalThis as any).env === 'object'
  ) {
    const gEnv = (globalThis as any).env;
    for (let i = 0; i < ADSENSE_ENV_KEYS.length; i++) {
      const key = ADSENSE_ENV_KEYS[i];
      if (key in gEnv) candidates.push(gEnv[key]);
    }
  }

  if (typeof process !== 'undefined' && process.env) {
    for (let i = 0; i < ADSENSE_ENV_KEYS.length; i++) {
      const key = ADSENSE_ENV_KEYS[i];
      if (key in process.env) candidates.push(process.env[key]);
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (typeof candidate === 'string') {
      const normalized = normalizeAdSenseClientId(candidate);
      if (normalized) return normalized;
    }
  }

  return null;
}

/**
 * Generates HTML <head> tags strictly for Google AdSense Auto Ads (no manual ad-slots).
 */
export function renderAdSenseHeadTags(clientId?: string | null): string {
  const normalized = normalizeAdSenseClientId(clientId);
  if (!normalized) return '';
  return [
    `<meta name="google-adsense-account" content="${normalized}">`,
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${normalized}" crossorigin="anonymous"></script>`,
  ].join('\n  ');
}

export function buildAdsTxtContent(clientId?: string | null): string {
  const pubId = extractAdSensePublisherId(clientId);
  return `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
}

export function buildRobotsTxtContent(baseUrl?: string | null): string {
  const cleanBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const sitemapLine = cleanBase ? `${cleanBase}/sitemap.xml` : '/sitemap.xml';
  return [
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
    `Sitemap: ${sitemapLine}`,
    '',
  ].join('\n');
}

export function buildSitemapXmlContent(baseUrl?: string | null): string {
  const cleanBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const lastMod = new Date().toISOString().split('T')[0];
  const entries = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/docs', changefreq: 'weekly', priority: '0.8' },
    { path: '/sobre', changefreq: 'monthly', priority: '0.7' },
    { path: '/contato', changefreq: 'monthly', priority: '0.7' },
    { path: '/politica-de-privacidade', changefreq: 'monthly', priority: '0.6' },
    { path: '/termos-de-uso', changefreq: 'monthly', priority: '0.6' },
  ];

  const urlNodes = entries
    .map((entry) => {
      const loc = cleanBase ? `${cleanBase}${entry.path}` : entry.path;
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes}\n</urlset>\n`;
}
