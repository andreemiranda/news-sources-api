import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rawSourcesData from '@/app/data/sources.json';
import { getEnv } from '@/src/config/env';

export interface Source {
  id: number | string;
  category: string;
  site: string;
  type: string;
  url: string;
  mediaUrl?: string;
  active: boolean;
  slug?: string;
  alt?: string;
}

export interface SourcesData {
  sources: Source[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export function generateValidId(url: string): number {
  const hash = crypto.createHash('sha256').update(url || Math.random().toString()).digest('hex');
  let id = '';
  for (let i = 0; i < hash.length; i++) {
    const charCode = hash.charCodeAt(i);
    let num = (charCode % 9) + 1; // 1 to 9 (no 0)
    id += num.toString();
    if (id.length === 13) break;
  }
  return parseInt(id, 10);
}

export function generate6DigitId(input: string): number {
  const hash = crypto.createHash('sha256').update(input || Math.random().toString()).digest('hex');
  let id = '';
  for (let i = 0; i < hash.length; i++) {
    const charCode = hash.charCodeAt(i);
    let num = (charCode % 9) + 1; // 1 to 9 (no 0)
    id += num.toString();
    if (id.length === 6) break;
  }
  return parseInt(id, 10);
}

export function isValidId(id: number | string | undefined | null): boolean {
  if (id === undefined || id === null) return false;
  const idStr = String(id).trim();
  return /^\d{1,15}$/.test(idStr);
}

export function getSourcesData(): SourcesData {
  // 1. Preferência imediata pelos dados empacotados (bundle) no build/compile time
  if (
    rawSourcesData &&
    typeof rawSourcesData === 'object' &&
    Array.isArray((rawSourcesData as any).sources) &&
    (rawSourcesData as any).sources.length > 0
  ) {
    return rawSourcesData as unknown as SourcesData;
  }

  // 2. Fallback seguro para ambiente Node.js com acesso a sistema de arquivos em disco
  try {
    if (
      typeof process !== 'undefined' &&
      typeof process.cwd === 'function' &&
      typeof fs !== 'undefined' &&
      typeof fs.existsSync === 'function'
    ) {
      const possiblePaths = [
        path.join(process.cwd(), 'app', 'data', 'sources.json'),
        path.join(process.cwd(), '.next', 'server', 'app', 'data', 'sources.json'),
      ];

      // Proteção rigorosa para evitar ReferenceError em ambientes Edge / Cloudflare Workers
      if (typeof __dirname !== 'undefined') {
        possiblePaths.push(
          path.join(__dirname, '..', 'app', 'data', 'sources.json'),
          path.join(__dirname, '..', 'data', 'sources.json')
        );
      }

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(fileContent) as SourcesData;
          if (data && Array.isArray(data.sources) && data.sources.length > 0) {
            return data;
          }
        }
      }
    }
  } catch {
    // Silencia qualquer erro de leitura de disco em ambiente serverless/edge
  }

  // 3. Fallback final garantido
  return (rawSourcesData as unknown as SourcesData) || { sources: [] };
}

export function getAllSources(req?: Request): Source[] {
  const appDomain = getBaseDomain(req);
  return getSourcesData().sources.map((source) => {
    const isLegacyOrVercel =
      !source.site ||
      source.site === 'news-sources-api.vercel.app' ||
      source.site.includes('vercel.app');

    return {
      ...source,
      site: isLegacyOrVercel ? appDomain : source.site,
    };
  });
}

export function getSourceById(id: number | string | undefined | null): Source | undefined {
  if (id === undefined || id === null) return undefined;
  const targetIdStr = String(id).trim();
  return getAllSources().find((s) => String(s.id).trim() === targetIdStr);
}

export interface CategoryItem {
  category: string;
  slug: string;
  count: number;
}

export function slugifyCategory(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getSourcesByCategory(categoryOrSlug: string): Source[] {
  if (!categoryOrSlug) return [];
  const normalizedInput = categoryOrSlug.toLowerCase().trim();
  const slugInput = slugifyCategory(categoryOrSlug);
  return getAllSources().filter((s) => {
    const cat = (s.category || '').toLowerCase().trim();
    const slug = slugifyCategory(s.category);
    return cat === normalizedInput || slug === slugInput || slug === normalizedInput;
  });
}

export function getCategories(): CategoryItem[] {
  const counts = new Map<string, number>();
  for (const s of getAllSources()) {
    if (s.category) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      slug: slugifyCategory(category),
      count,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function getTypes(): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of getAllSources()) {
    if (s.type) {
      counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function getAllMediaSources(): Source[] {
  return getAllSources().filter(
    (s) => Boolean(s.mediaUrl) || s.type === 'wp-api'
  );
}

export function getMediaSourceById(id: number | string | undefined | null): Source | undefined {
  if (id === undefined || id === null) return undefined;
  const targetIdStr = String(id).trim();
  return (
    getAllMediaSources().find((s) => String(s.id).trim() === targetIdStr) ||
    getSourceById(id)
  );
}

export function getStats() {
  const sources = getAllSources();
  const mediaSources = getAllMediaSources();
  const categories = getCategories();
  const types = getTypes();

  return {
    totalSources: sources.length,
    totalMediaSources: mediaSources.length,
    totalCategories: categories.length,
    totalTypes: types.length,
    activeSources: sources.filter((s) => s.active).length,
    activeMediaSources: mediaSources.filter((s) => s.active).length,
    categories,
    types,
  };
}

export function getBaseUrl(req?: Request): string {
  // 1. Explicit APP_URL or APP_DOMAIN environment configurations
  const envUrl =
    process.env.APP_URL ||
    getEnv().APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    getEnv().NEXT_PUBLIC_APP_URL;

  if (envUrl && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  // If APP_DOMAIN is configured directly (e.g. app.camaraparaiso.gov.br)
  const envDomain =
    process.env.APP_DOMAIN ||
    getEnv().APP_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    getEnv().NEXT_PUBLIC_APP_DOMAIN;

  if (envDomain && envDomain.trim()) {
    let cleanDomain = envDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
    return `https://${cleanDomain}`;
  }

  // Fallback to NEXT_PUBLIC_BASE_URL
  const legacyBaseUrl = getEnv().NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (legacyBaseUrl && legacyBaseUrl.trim()) {
    let clean = legacyBaseUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  // 2. Platform environment variables (Vercel, Railway, Render)
  const platformUrl =
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined) ||
    process.env.RENDER_EXTERNAL_URL;

  if (platformUrl && platformUrl.trim()) {
    let clean = platformUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  // 3. Request headers (X-Forwarded-Host or Host)
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
    }
    try {
      const parsed = new URL(req.url);
      return parsed.origin;
    } catch {
      // fallback
    }
  }

  // 4. Client-side browser runtime
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 5. Local development server fallback
  const port = getEnv().PORT || 3000;
  return `http://localhost:${port}`;
}

export function getBaseDomain(req?: Request): string {
  // 1. Direct APP_DOMAIN environment variable
  const envDomain =
    process.env.APP_DOMAIN ||
    getEnv().APP_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    getEnv().NEXT_PUBLIC_APP_DOMAIN;

  if (envDomain && envDomain.trim()) {
    return envDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '');
  }

  // 2. Extract from APP_URL / getBaseUrl
  const url = getBaseUrl(req);
  return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || 'localhost';
}

/**
 * Formula URLs da aplicação utilizando a variável APP_URL ou APP_DOMAIN
 */
export function formatAppUrl(path: string = '', req?: Request): string {
  const base = getBaseUrl(req);
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${base}${cleanPath}`;
}

/**
 * Formula endereços de e-mail institucionais utilizando a variável APP_DOMAIN ou APP_URL
 * Exemplo: formatAppEmail('contato') => 'contato@dominio.com.br'
 */
export function formatAppEmail(userPart: string = 'contato', req?: Request): string {
  const domain = getBaseDomain(req);
  const cleanUser = userPart.trim().replace(/@.*$/, '') || 'contato';
  return `${cleanUser}@${domain}`;
}

