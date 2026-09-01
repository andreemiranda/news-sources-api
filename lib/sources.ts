import sourcesData from '@/data/sources.json';

export interface Source {
  id: string;
  category: string;
  site: string;
  type: string;
  url: string;
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

export function getSourcesData(): SourcesData {
  return sourcesData as SourcesData;
}

export function getAllSources(): Source[] {
  return getSourcesData().sources;
}

export function getSourceById(id: string): Source | undefined {
  return getAllSources().find((s) => s.id === id);
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

export function getStats() {
  const sources = getAllSources();
  const categories = getCategories();
  const types = getTypes();

  return {
    totalSources: sources.length,
    totalCategories: categories.length,
    totalTypes: types.length,
    activeSources: sources.filter((s) => s.active).length,
    categories,
    types,
  };
}
