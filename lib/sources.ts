import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Source {
  id: number;
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

export function isValidId(id: number | string | undefined): boolean {
  if (!id) return false;
  const idStr = String(id);
  if (idStr.length !== 15) return false;
  if (idStr.includes('0')) return false;
  if (!/^\d+$/.test(idStr)) return false;
  return true;
}

export function getSourcesData(): SourcesData {
  try {
    const filePath = path.join(process.cwd(), 'app', 'data', 'sources.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent) as SourcesData;
    
    let modified = false;
    data.sources.forEach(source => {
      if (!isValidId(source.id)) {
        source.id = generateValidId(source.url);
        modified = true;
      } else if (typeof source.id === 'string') {
        source.id = parseInt(source.id, 10);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
    return data;
  } catch (error) {
    console.error('Error reading sources.json', error);
    return { sources: [] };
  }
}

export function getAllSources(): Source[] {
  return getSourcesData().sources;
}

export function getSourceById(id: number | string): Source | undefined {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return getAllSources().find((s) => s.id === numericId);
}

export function getSourcesByCategory(category: string): Source[] {
  const normalized = category.toLowerCase().trim();
  return getAllSources().filter(
    (s) => s.category.toLowerCase() === normalized
  );
}

export function getCategories(): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of getAllSources()) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function getTypes(): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of getAllSources()) {
    counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
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

export function getMediaSourceById(id: number | string): Source | undefined {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return getAllMediaSources().find((s) => s.id === numericId) || getSourceById(id);
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
