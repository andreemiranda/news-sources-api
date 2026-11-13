import {
  Source,
  getAllSources,
  getAllMediaSources,
  getCategories,
  getTypes,
  getBaseUrl,
  getBaseDomain,
  slugifyCategory,
} from './sources';
import { resilientFetch, parseRssFeed } from './content';

export interface PaginationMetaReport {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PageReport {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface SourceNewsStatsItem {
  id: number | string;
  category: string;
  type: string;
  active: boolean;
  status: 'online' | 'unavailable';
  totalNews: number;
  totalPages: number;
  meta: PaginationMetaReport;
  page: PageReport;
  _links: {
    self: { href: string };
    news: { href: string };
    images: { href: string };
  };
}

export interface CategoryNewsStatsItem {
  category: string;
  slug: string;
  sourcesCount: number;
  onlineSources: number;
  totalNews: number;
  totalPages: number;
  totalPagesBySourceSum: number;
  meta: PaginationMetaReport;
  page: PageReport;
  sources: SourceNewsStatsItem[];
}

export interface DetailedNewsStatsReport {
  success: boolean;
  status: string;
  timestamp: string;
  cached: boolean;
  itemsPerPage: number;
  meta: PaginationMetaReport;
  page: PageReport;
  summary: {
    totalNews: number;
    totalPages: number;
    totalPagesBySourceSum: number;
    itemsPerPage: number;
    totalSources: number;
    activeSources: number;
    onlineSources: number;
    unavailableSources: number;
    totalMediaSources: number;
    totalCategories: number;
    byType: Record<
      string,
      {
        sources: number;
        onlineSources: number;
        totalNews: number;
        totalPages: number;
      }
    >;
  };
  categories: CategoryNewsStatsItem[];
  sources: SourceNewsStatsItem[];
  _links: Record<string, { href: string }>;
}

export function getApiIndexPayload(req?: Request) {
  const baseUrl = getBaseUrl(req);
  const baseDomain = getBaseDomain(req);
  const sources = getAllSources(req);
  const mediaSources = getAllMediaSources();
  const categories = getCategories();
  const types = getTypes();

  return {
    success: true,
    name: 'News & Media Sources API',
    version: '1.0.0',
    status: 'online',
    description:
      'API REST para agregação, sanitização e distribuição em tempo real de notícias, mídias e estatísticas consolidadas.',
    baseUrl,
    domain: baseDomain,
    timestamp: new Date().toISOString(),
    documentation: {
      swagger: `${baseUrl}/`,
      rapidoc: `${baseUrl}/docs`,
      openapi: `${baseUrl}/api/openapi.json`,
    },
    authentication: {
      required: true,
      publicRoutes: ['/api', '/api/health', '/api/version', '/api/openapi.json', '/api/sync'],
      methods: [
        'Authorization: Bearer <chave>',
        'Header: x-api-key: <chave>',
        'Query parameter: ?ref=<chave>',
      ],
    },
    overview: {
      totalSources: sources.length,
      activeSources: sources.filter((s) => s.active).length,
      totalMediaSources: mediaSources.length,
      totalCategories: categories.length,
      totalTypes: types.length,
      categories,
      types,
    },
    endpoints: {
      index: { method: 'GET', path: '/api', href: `${baseUrl}/api`, public: true },
      health: { method: 'GET', path: '/api/health', href: `${baseUrl}/api/health`, public: true },
      version: { method: 'GET', path: '/api/version', href: `${baseUrl}/api/version`, public: true },
      openapi: { method: 'GET', path: '/api/openapi.json', href: `${baseUrl}/api/openapi.json`, public: true },
      sync: { method: 'GET', path: '/api/sync', href: `${baseUrl}/api/sync`, public: true },
      news: { method: 'GET', path: '/api/news', href: `${baseUrl}/api/news`, public: false },
      newsById: {
        method: 'GET',
        path: '/api/news/{id}',
        href: `${baseUrl}/api/news/{id}`,
        templated: true,
        public: false,
      },
      newsByCategory: {
        method: 'GET',
        path: '/api/news/category/{category}',
        href: `${baseUrl}/api/news/category/{category}`,
        templated: true,
        public: false,
      },
      images: { method: 'GET', path: '/api/images', href: `${baseUrl}/api/images`, public: false },
      imagesById: {
        method: 'GET',
        path: '/api/images/{id}',
        href: `${baseUrl}/api/images/{id}`,
        templated: true,
        public: false,
      },
      categories: { method: 'GET', path: '/api/categories', href: `${baseUrl}/api/categories`, public: false },
      types: { method: 'GET', path: '/api/types', href: `${baseUrl}/api/types`, public: false },
      stats: { method: 'GET', path: '/api/stats', href: `${baseUrl}/api/stats`, public: false },
      statsNews: { method: 'GET', path: '/api/stats/news', href: `${baseUrl}/api/stats/news`, public: false },
      revalidate: { method: 'GET/POST', path: '/api/revalidate', href: `${baseUrl}/api/revalidate`, public: false },
    },
    _links: {
      self: { href: `${baseUrl}/api` },
      health: { href: `${baseUrl}/api/health` },
      version: { href: `${baseUrl}/api/version` },
      openapi: { href: `${baseUrl}/api/openapi.json` },
      docs: { href: `${baseUrl}/docs` },
      news: { href: `${baseUrl}/api/news` },
      images: { href: `${baseUrl}/api/images` },
      categories: { href: `${baseUrl}/api/categories` },
      types: { href: `${baseUrl}/api/types` },
      stats: { href: `${baseUrl}/api/stats` },
      statsNews: { href: `${baseUrl}/api/stats/news` },
      sync: { href: `${baseUrl}/api/sync` },
    },
  };
}

interface CachedStatsEntry {
  timestamp: number;
  data: Omit<DetailedNewsStatsReport, 'cached' | '_links' | 'sources' | 'categories'> & {
    rawSources: Array<{
      id: number | string;
      category: string;
      type: string;
      active: boolean;
      status: 'online' | 'unavailable';
      totalNews: number;
      totalPages: number;
    }>;
  };
}

const STATS_CACHE_TTL_MS = 180_000; // 3 minutos
const statsMemoryCache = new Map<string, CachedStatsEntry>();

function buildMetaAndPage(
  totalItems: number,
  itemsPerPage: number
): { meta: PaginationMetaReport; page: PageReport; totalPages: number } {
  const safeTotal = Math.max(0, totalItems);
  const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / itemsPerPage) : 0;
  const itemCount = Math.min(itemsPerPage, safeTotal);

  return {
    totalPages,
    meta: {
      itemCount,
      totalItems: safeTotal,
      itemsPerPage,
      totalPages,
      currentPage: 1,
    },
    page: {
      size: itemsPerPage,
      totalElements: safeTotal,
      totalPages,
      number: 1,
    },
  };
}

async function probeSingleSourceCount(
  source: Source,
  itemsPerPage: number,
  bypassCache: boolean
): Promise<{
  id: number | string;
  category: string;
  type: string;
  active: boolean;
  status: 'online' | 'unavailable';
  totalNews: number;
  totalPages: number;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    if (source.type === 'wp-api') {
      const urlObj = new URL(source.url);
      urlObj.searchParams.set('page', '1');
      urlObj.searchParams.set('per_page', '1');
      urlObj.searchParams.set('_fields', 'id');

      let response: Response | undefined;
      let primaryError = false;
      try {
        response = await resilientFetch(urlObj.toString(), source.site, true, controller.signal, bypassCache);
      } catch {
        primaryError = true;
      }

      if (!primaryError && response && response.ok) {
        const totalHeader = response.headers.get('x-wp-total');
        if (totalHeader !== null) {
          const total = parseInt(totalHeader, 10);
          if (!isNaN(total) && total >= 0) {
            clearTimeout(timeoutId);
            return {
              id: source.id,
              category: source.category,
              type: source.type,
              active: Boolean(source.active),
              status: 'online',
              totalNews: total,
              totalPages: total > 0 ? Math.ceil(total / itemsPerPage) : 0,
            };
          }
        }
        try {
          const json = await response.json();
          const count = Array.isArray(json) ? json.length : 0;
          clearTimeout(timeoutId);
          return {
            id: source.id,
            category: source.category,
            type: source.type,
            active: Boolean(source.active),
            status: 'online',
            totalNews: count,
            totalPages: count > 0 ? Math.ceil(count / itemsPerPage) : 0,
          };
        } catch {
          // fallback abaixo
        }
      }

      // Fallback para feed RSS padrão quando WP-API falhar
      try {
        const feedUrl = `${urlObj.origin}/feed/`;
        const feedRes = await resilientFetch(feedUrl, source.site, false, controller.signal, bypassCache);
        if (feedRes.ok) {
          const xmlText = await feedRes.text();
          const { items } = parseRssFeed(xmlText, source.category, source.id);
          clearTimeout(timeoutId);
          const count = items.length;
          return {
            id: source.id,
            category: source.category,
            type: source.type,
            active: Boolean(source.active),
            status: 'online',
            totalNews: count,
            totalPages: count > 0 ? Math.ceil(count / itemsPerPage) : 0,
          };
        }
      } catch {
        // indisponível
      }

      clearTimeout(timeoutId);
      return {
        id: source.id,
        category: source.category,
        type: source.type,
        active: Boolean(source.active),
        status: 'unavailable',
        totalNews: 0,
        totalPages: 0,
      };
    }

    // Fonte RSS
    const response = await resilientFetch(source.url, source.site, false, controller.signal, bypassCache);
    if (!response.ok) {
      clearTimeout(timeoutId);
      return {
        id: source.id,
        category: source.category,
        type: source.type,
        active: Boolean(source.active),
        status: 'unavailable',
        totalNews: 0,
        totalPages: 0,
      };
    }

    const xmlText = await response.text();
    const { items } = parseRssFeed(xmlText, source.category, source.id);
    clearTimeout(timeoutId);
    const count = items.length;

    return {
      id: source.id,
      category: source.category,
      type: source.type,
      active: Boolean(source.active),
      status: 'online',
      totalNews: count,
      totalPages: count > 0 ? Math.ceil(count / itemsPerPage) : 0,
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      id: source.id,
      category: source.category,
      type: source.type,
      active: Boolean(source.active),
      status: 'unavailable',
      totalNews: 0,
      totalPages: 0,
    };
  }
}

export interface DetailedStatsOptions {
  itemsPerPage?: number;
  category?: string;
  type?: string;
  refresh?: boolean;
}

export async function getDetailedNewsStats(
  options: DetailedStatsOptions = {},
  req?: Request
): Promise<DetailedNewsStatsReport> {
  const baseUrl = getBaseUrl(req);
  const itemsPerPage = Math.min(30, Math.max(1, options.itemsPerPage || 10));
  const categoryFilter = options.category?.trim();
  const typeFilter = options.type?.trim();
  const refresh = Boolean(options.refresh);

  const cacheKey = `${itemsPerPage}|${categoryFilter || '*'}|${typeFilter || '*'}`;
  const existing = statsMemoryCache.get(cacheKey);
  let isCached = false;

  let rawSources: Array<{
    id: number | string;
    category: string;
    type: string;
    active: boolean;
    status: 'online' | 'unavailable';
    totalNews: number;
    totalPages: number;
  }>;

  if (!refresh && existing && Date.now() - existing.timestamp < STATS_CACHE_TTL_MS) {
    rawSources = existing.data.rawSources;
    isCached = true;
  } else {
    let targetSources = getAllSources(req);
    if (categoryFilter) {
      const normalized = categoryFilter.toLowerCase();
      const slugFilter = slugifyCategory(categoryFilter);
      targetSources = targetSources.filter((s) => {
        const cat = (s.category || '').toLowerCase().trim();
        return cat === normalized || slugifyCategory(s.category) === slugFilter;
      });
    }
    if (typeFilter) {
      targetSources = targetSources.filter((s) => s.type === typeFilter);
    }

    const results: typeof rawSources = [];
    const batchSize = 16;
    for (let i = 0; i < targetSources.length; i += batchSize) {
      const batch = targetSources.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map((src) => probeSingleSourceCount(src, itemsPerPage, refresh))
      );
      for (let j = 0; j < settled.length; j++) {
        const res = settled[j];
        if (res.status === 'fulfilled') {
          results.push(res.value);
        } else {
          const src = batch[j];
          results.push({
            id: src.id,
            category: src.category,
            type: src.type,
            active: Boolean(src.active),
            status: 'unavailable',
            totalNews: 0,
            totalPages: 0,
          });
        }
      }
    }

    rawSources = results;
    statsMemoryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: {
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        itemsPerPage,
        meta: buildMetaAndPage(0, itemsPerPage).meta,
        page: buildMetaAndPage(0, itemsPerPage).page,
        summary: {} as any,
        rawSources,
      },
    });
  }

  const allMediaSources = getAllMediaSources();

  const sourceReports: SourceNewsStatsItem[] = rawSources.map((src) => {
    const { meta, page } = buildMetaAndPage(src.totalNews, itemsPerPage);
    return {
      ...src,
      meta,
      page,
      _links: {
        self: { href: `${baseUrl}/api/news/${src.id}?page=1&limit=${itemsPerPage}` },
        news: { href: `${baseUrl}/api/news/${src.id}` },
        images: { href: `${baseUrl}/api/images/${src.id}` },
      },
    };
  });

  // Agrupamento por categoria
  const categoryMap = new Map<string, SourceNewsStatsItem[]>();
  for (const s of sourceReports) {
    const key = s.category || 'Geral';
    const list = categoryMap.get(key) || [];
    list.push(s);
    categoryMap.set(key, list);
  }

  const categories: CategoryNewsStatsItem[] = Array.from(categoryMap.entries())
    .map(([category, catSources]) => {
      const catTotalNews = catSources.reduce((acc, s) => acc + s.totalNews, 0);
      const catTotalPagesBySourceSum = catSources.reduce((acc, s) => acc + s.totalPages, 0);
      const onlineSources = catSources.filter((s) => s.status === 'online').length;
      const { meta, page, totalPages } = buildMetaAndPage(catTotalNews, itemsPerPage);

      return {
        category,
        slug: slugifyCategory(category),
        sourcesCount: catSources.length,
        onlineSources,
        totalNews: catTotalNews,
        totalPages,
        totalPagesBySourceSum: catTotalPagesBySourceSum,
        meta,
        page,
        sources: catSources,
      };
    })
    .sort((a, b) => b.totalNews - a.totalNews || a.category.localeCompare(b.category));

  const totalNews = sourceReports.reduce((acc, s) => acc + s.totalNews, 0);
  const totalPagesBySourceSum = sourceReports.reduce((acc, s) => acc + s.totalPages, 0);
  const onlineSources = sourceReports.filter((s) => s.status === 'online').length;
  const unavailableSources = sourceReports.length - onlineSources;
  const globalReport = buildMetaAndPage(totalNews, itemsPerPage);

  const byType: Record<
    string,
    { sources: number; onlineSources: number; totalNews: number; totalPages: number }
  > = {};

  for (const s of sourceReports) {
    if (!byType[s.type]) {
      byType[s.type] = { sources: 0, onlineSources: 0, totalNews: 0, totalPages: 0 };
    }
    byType[s.type].sources += 1;
    if (s.status === 'online') byType[s.type].onlineSources += 1;
    byType[s.type].totalNews += s.totalNews;
    byType[s.type].totalPages += s.totalPages;
  }

  return {
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    cached: isCached,
    itemsPerPage,
    meta: globalReport.meta,
    page: globalReport.page,
    summary: {
      totalNews,
      totalPages: globalReport.totalPages,
      totalPagesBySourceSum,
      itemsPerPage,
      totalSources: sourceReports.length,
      activeSources: sourceReports.filter((s) => s.active).length,
      onlineSources,
      unavailableSources,
      totalMediaSources: allMediaSources.length,
      totalCategories: categories.length,
      byType,
    },
    categories,
    sources: sourceReports,
    _links: {
      self: { href: `${baseUrl}/api/stats/news?limit=${itemsPerPage}` },
      stats: { href: `${baseUrl}/api/stats` },
      news: { href: `${baseUrl}/api/news` },
      images: { href: `${baseUrl}/api/images` },
      categories: { href: `${baseUrl}/api/categories` },
      api: { href: `${baseUrl}/api` },
    },
  };
}
