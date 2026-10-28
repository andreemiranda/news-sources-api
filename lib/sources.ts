import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import rawSourcesData from '@/app/data/sources.json';

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
  const possiblePaths = [
    path.join(process.cwd(), 'app', 'data', 'sources.json'),
    path.join(process.cwd(), '.next', 'server', 'app', 'data', 'sources.json'),
    path.join(__dirname, '..', 'app', 'data', 'sources.json'),
    path.join(__dirname, '..', 'data', 'sources.json'),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent) as SourcesData;
        if (data && Array.isArray(data.sources) && data.sources.length > 0) {
          return data;
        }
      }
    } catch (e) {
      // Continue to next path or bundled data
    }
  }

  // Fallback direct to bundled rawSourcesData imported at build time
  return (rawSourcesData as unknown as SourcesData) || { sources: [] };
}

export function getAllSources(): Source[] {
  return getSourcesData().sources;
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
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }
    try {
      const parsed = new URL(req.url);
      return parsed.origin;
    } catch {
      // fallback
    }
  }
  return 'https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app';
}

export function getBaseDomain(req?: Request): string {
  const url = getBaseUrl(req);
  return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}
