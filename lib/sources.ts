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

const DATA: SourcesData = sourcesData as SourcesData;

export function getSourcesData(): SourcesData {
  return DATA;
}

export function getAllSources(): Source[] {
  return DATA.sources;
}

export function getSourceById(id: string): Source | undefined {
  return DATA.sources.find((s) => s.id === id);
}

export function getSourcesByCategory(category: string): Source[] {
  const normalized = category.toLowerCase().trim();
  return DATA.sources.filter(
    (s) => s.category.toLowerCase() === normalized
  );
}

export function getCategories(): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of DATA.sources) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function getTypes(): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of DATA.sources) {
    counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function getStats() {
  const sources = DATA.sources;
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
