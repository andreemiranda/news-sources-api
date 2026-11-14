import fs from 'fs';
import path from 'path';

const nextDir = path.resolve(process.cwd(), '.next');

if (fs.existsSync(nextDir)) {
  // Remove Next.js webpack build cache (.next/cache) so Wrangler never hits Cloudflare's 25 MiB per-asset limit
  const cacheDir = path.join(nextDir, 'cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }

  // Write .assetsignore so Wrangler skips server/standalone build internals while keeping them intact for Node/Docker
  const assetsIgnoreContent = [
    '# Ignore Next.js build cache and server/standalone artifacts in Cloudflare Workers [assets]',
    'cache',
    'cache/**',
    'standalone',
    'standalone/**',
    'server',
    'server/**',
    'trace',
    'types',
    'types/**',
    '*.nft.json',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(nextDir, '.assetsignore'), assetsIgnoreContent, 'utf8');
}
