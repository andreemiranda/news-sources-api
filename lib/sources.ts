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
    let num = (charCode % 9) + 1; // 1 to 9
    id += num.toString();
    if (id.length === 15) break;
  }
  return parseInt(id, 10);
}

export function isValidId(id: number | string | undefined | null): boolean {
  if (id === undefined || id === null) return false;
  const idStr = String(id).trim();
  return idStr.length > 0;
}

export function getSourcesData(): SourcesData {
  try {
    const filePath = path.join(process.cwd(), 'app', 'data', 'sources.json');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent) as SourcesData;
      if (data && Array.isArray(data.sources)) {
        return data;
      }
    }
  } catch (error) {
    // In production/serverless environments, fallback to bundled data
  }
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

export function getSourcesByCategory(category: string): Source[] {
  if (!category) return [];
  const normalized = category.toLowerCase().trim();
  return getAllSources().filter(
    (s) => (s.category || '').toLowerCase().trim() === normalized
  );
}

export function getCategories(): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of getAllSources()) {
    if (s.category) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
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
