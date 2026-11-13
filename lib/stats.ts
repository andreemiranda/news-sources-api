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
import {
  resilientFetch,
  parseRssFeed,
  resolveWpTotalCount,
  isCloudflareWorkersRuntime,
} from './content';

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
  // Campos opcionais retrocompatíveis de diagnóstico e observabilidade
  httpStatus?: number | null;
  errorReason?: string | null;
  responseSize?: number;
  parsedItems?: number;
  discardedItems?: number;
  lastSuccessfulCheck?: string;
  stale?: boolean;
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
    staleSources?: number;
    partialProbe?: boolean;
    deferredSources?: number;
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

export interface LastKnownGoodEntry {
  totalNews: number;
  lastSuccessfulCheck: string;
  httpStatus?: number | null;
  responseSize?: number;
  parsedItems?: number;
  discardedItems?: number;
}

export interface RawSourceProbeRecord {
  id: number | string;
  category: string;
  type: string;
  active: boolean;
  status: 'online' | 'unavailable';
  totalNews: number;
  httpStatus?: number | null;
  errorReason?: string | null;
  responseSize?: number;
  parsedItems?: number;
  discardedItems?: number;
  lastSuccessfulCheck?: string;
  stale?: boolean;
}

interface StoredSourceState {
  lastAttemptAt: number;
  ttlMs: number;
  latest: RawSourceProbeRecord;
  lastKnownGood?: LastKnownGoodEntry;
}

const STATS_CACHE_TTL_MS = 180_000; // 3 minutos para resultados válidos
const STALE_RETRY_TTL_MS = 30_000; // 30 segundos para tentativas com falha transitória
const WORKER_CACHE_KEY_URL = 'https://news-sources-api.internal/stats-state-v2.json';
const WORKER_KV_KEY = 'stats_sources_state_v2';

const sourceStateStore = new Map<string, StoredSourceState>();

export function clearStatsCache(): void {
  sourceStateStore.clear();
}

function getHostnameSafe(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'unknown-host';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function classifyHttpFailureReason(status: number): string {
  if (status === 401 || status === 403 || status === 406 || status === 429 || status === 503) {
    return 'http_blocked';
  }
  return 'http_error';
}

function classifyThrownError(err: any): { reason: string; isRetryable: boolean } {
  const name = String(err?.name || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.cause?.code || err?.code || '').toLowerCase();

  if (
    err?.isTimeoutError ||
    name === 'timeouterror' ||
    name === 'aborterror' ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  ) {
    return { reason: 'timeout', isRetryable: true };
  }

  if (code === 'enotfound' || msg.includes('enotfound')) {
    return { reason: 'connection_error', isRetryable: false };
  }

  return { reason: 'connection_error', isRetryable: true };
}

function shouldRetryHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

async function fetchWithRetry(
  url: string,
  site: string,
  isJson: boolean,
  bypassCache: boolean,
  ctx: {
    trackSubrequest: () => void;
    shouldContinueSubrequests: () => boolean;
    retryEnabled: boolean;
    perAttemptTimeoutMs?: number;
  }
): Promise<Response> {
  const maxAttempts = ctx.retryEnabled ? 2 : 1;
  let lastError: any;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      if (!ctx.shouldContinueSubrequests()) {
        break;
      }
      const retryAfterRaw = lastResponse?.headers?.get?.('retry-after');
      const retryAfterSec = retryAfterRaw ? parseInt(retryAfterRaw, 10) : NaN;
      const delayMs = !isNaN(retryAfterSec) && retryAfterSec > 0
        ? Math.min(1200, retryAfterSec * 1000)
        : 250;
      await sleep(delayMs);
    }

    try {
      const response = await resilientFetch(url, site, isJson, undefined, bypassCache, {
        perAttemptTimeoutMs: ctx.perAttemptTimeoutMs ?? 9000,
        onSubrequest: ctx.trackSubrequest,
        shouldContinue: ctx.shouldContinueSubrequests,
      });

      if (response.ok || !shouldRetryHttpStatus(response.status) || attempt === maxAttempts - 1) {
        return response;
      }

      lastResponse = response;
    } catch (err: any) {
      lastError = err;
      const classified = classifyThrownError(err);
      if (!classified.isRetryable || attempt === maxAttempts - 1) {
        throw err;
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}

interface ProbeOutcome {
  ok: boolean;
  record: RawSourceProbeRecord;
}

async function probeSingleSourceCount(
  source: Source,
  itemsPerPage: number,
  bypassCache: boolean,
  ctx: {
    trackSubrequest: () => void;
    shouldContinueSubrequests: () => boolean;
    retryEnabled: boolean;
  }
): Promise<ProbeOutcome> {
  if (source.type === 'wp-api') {
    const urlObj = new URL(source.url);
    urlObj.searchParams.set('page', '1');
    urlObj.searchParams.set('per_page', '10');
    urlObj.searchParams.set('_fields', 'id');

    let wpHttpStatus: number | null = null;
    let wpResponseSize: number | undefined;
    let wpErrorReason: string | null = null;

    if (ctx.shouldContinueSubrequests()) {
      try {
        const response = await fetchWithRetry(urlObj.toString(), source.site, true, bypassCache, {
          ...ctx,
          perAttemptTimeoutMs: 9000,
        });
        wpHttpStatus = response.status;

        if (response.ok) {
          const rawText = await response.text();
          wpResponseSize = rawText.length;

          let parsedJson: any = null;
          let jsonValid = false;
          try {
            parsedJson = JSON.parse(rawText);
            jsonValid = Array.isArray(parsedJson);
          } catch {
            jsonValid = false;
          }

          if (jsonValid) {
            const resolved = await resolveWpTotalCount(
              source.url,
              response,
              parsedJson,
              source.site,
              10,
              itemsPerPage,
              bypassCache,
              {
                perAttemptTimeoutMs: 9000,
                onSubrequest: ctx.trackSubrequest,
                shouldContinue: ctx.shouldContinueSubrequests,
              }
            );

            const total = resolved.total;
            return {
              ok: true,
              record: {
                id: source.id,
                category: source.category,
                type: source.type,
                active: Boolean(source.active),
                status: 'online',
                totalNews: total,
                httpStatus: wpHttpStatus,
                errorReason: total === 0 ? 'empty_feed' : null,
                responseSize: wpResponseSize,
                parsedItems: parsedJson.length,
                discardedItems: 0,
              },
            };
          } else {
            wpErrorReason = 'json_parse_error';
          }
        } else {
          wpErrorReason = classifyHttpFailureReason(response.status);
          try {
            const errTxt = await response.text();
            wpResponseSize = errTxt.length;
          } catch {
            // ignore body read error on non-200
          }
        }
      } catch (err: any) {
        wpErrorReason = classifyThrownError(err).reason;
      }
    }

    // Fallback para feed RSS/Atom quando WP-API falhar ou retornar HTML em vez de JSON
    if (ctx.shouldContinueSubrequests()) {
      try {
        const feedUrl = `${urlObj.origin}/feed/`;
        const feedRes = await fetchWithRetry(feedUrl, source.site, false, bypassCache, {
          ...ctx,
          perAttemptTimeoutMs: 9000,
        });

        const feedStatus = feedRes.status;
        if (feedRes.ok) {
          const xmlText = await feedRes.text();
          const feedSize = xmlText.length;
          const parsed = parseRssFeed(xmlText, source.category, source.id);

          if (parsed.isValidFeed) {
            const count = parsed.items.length;
            const errorReason =
              count === 0
                ? parsed.rawItemCount > 0
                  ? 'filtered_to_zero'
                  : 'empty_feed'
                : null;

            return {
              ok: true,
              record: {
                id: source.id,
                category: source.category,
                type: source.type,
                active: Boolean(source.active),
                status: 'online',
                totalNews: count,
                httpStatus: feedStatus,
                errorReason,
                responseSize: feedSize,
                parsedItems: parsed.rawItemCount,
                discardedItems: parsed.filteredOutCount,
              },
            };
          }

          return {
            ok: false,
            record: {
              id: source.id,
              category: source.category,
              type: source.type,
              active: Boolean(source.active),
              status: 'unavailable',
              totalNews: 0,
              httpStatus: feedStatus,
              errorReason: wpErrorReason || 'rss_parse_error',
              responseSize: feedSize,
            },
          };
        }

        return {
          ok: false,
          record: {
            id: source.id,
            category: source.category,
            type: source.type,
            active: Boolean(source.active),
            status: 'unavailable',
            totalNews: 0,
            httpStatus: wpHttpStatus ?? feedStatus,
            errorReason: wpErrorReason || classifyHttpFailureReason(feedStatus),
            responseSize: wpResponseSize,
          },
        };
      } catch (feedErr: any) {
        return {
          ok: false,
          record: {
            id: source.id,
            category: source.category,
            type: source.type,
            active: Boolean(source.active),
            status: 'unavailable',
            totalNews: 0,
            httpStatus: wpHttpStatus,
            errorReason: wpErrorReason || classifyThrownError(feedErr).reason,
            responseSize: wpResponseSize,
          },
        };
      }
    }

    return {
      ok: false,
      record: {
        id: source.id,
        category: source.category,
        type: source.type,
        active: Boolean(source.active),
        status: 'unavailable',
        totalNews: 0,
        httpStatus: wpHttpStatus,
        errorReason: wpErrorReason || 'connection_error',
        responseSize: wpResponseSize,
      },
    };
  }

  // Fonte RSS / Atom
  try {
    const response = await fetchWithRetry(source.url, source.site, false, bypassCache, {
      ...ctx,
      perAttemptTimeoutMs: 9000,
    });
    const httpStatus = response.status;

    if (!response.ok) {
      let errSize: number | undefined;
      try {
        errSize = (await response.text()).length;
      } catch {
        // ignore body read error
      }
      return {
        ok: false,
        record: {
          id: source.id,
          category: source.category,
          type: source.type,
          active: Boolean(source.active),
          status: 'unavailable',
          totalNews: 0,
          httpStatus,
          errorReason: classifyHttpFailureReason(httpStatus),
          responseSize: errSize,
        },
      };
    }

    const xmlText = await response.text();
    const responseSize = xmlText.length;
    const parsed = parseRssFeed(xmlText, source.category, source.id);

    if (!parsed.isValidFeed) {
      return {
        ok: false,
        record: {
          id: source.id,
          category: source.category,
          type: source.type,
          active: Boolean(source.active),
          status: 'unavailable',
          totalNews: 0,
          httpStatus,
          errorReason: 'rss_parse_error',
          responseSize,
        },
      };
    }

    const count = parsed.items.length;
    const errorReason =
      count === 0
        ? parsed.rawItemCount > 0
          ? 'filtered_to_zero'
          : 'empty_feed'
        : null;

    return {
      ok: true,
      record: {
        id: source.id,
        category: source.category,
        type: source.type,
        active: Boolean(source.active),
        status: 'online',
        totalNews: count,
        httpStatus,
        errorReason,
        responseSize,
        parsedItems: parsed.rawItemCount,
        discardedItems: parsed.filteredOutCount,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      record: {
        id: source.id,
        category: source.category,
        type: source.type,
        active: Boolean(source.active),
        status: 'unavailable',
        totalNews: 0,
        httpStatus: null,
        errorReason: classifyThrownError(err).reason,
      },
    };
  }
}

async function runWithPerHostConcurrency<T>(
  items: T[],
  getHost: (item: T) => string,
  worker: (item: T) => Promise<void>,
  options: { globalLimit: number; perHostLimit: number; staggerMs: number }
): Promise<void> {
  if (items.length === 0) return;

  const pending = [...items];
  const inFlightByHost = new Map<string, number>();
  const lastDispatchedAtByHost = new Map<string, number>();
  let totalInFlight = 0;

  await new Promise<void>((resolve) => {
    const schedule = () => {
      if (pending.length === 0 && totalInFlight === 0) {
        resolve();
        return;
      }

      const now = Date.now();
      let earliestRetryDelay: number | null = null;

      while (totalInFlight < options.globalLimit && pending.length > 0) {
        let pickedIndex = -1;

        for (let i = 0; i < pending.length; i++) {
          const host = getHostnameSafe(getHost(pending[i]));
          const hostInFlight = inFlightByHost.get(host) || 0;
          if (hostInFlight >= options.perHostLimit) continue;

          const lastAt = lastDispatchedAtByHost.get(host) || 0;
          const elapsed = now - lastAt;
          if (elapsed < options.staggerMs) {
            const wait = options.staggerMs - elapsed;
            if (earliestRetryDelay === null || wait < earliestRetryDelay) {
              earliestRetryDelay = wait;
            }
            continue;
          }

          pickedIndex = i;
          break;
        }

        if (pickedIndex === -1) {
          break;
        }

        const [item] = pending.splice(pickedIndex, 1);
        const host = getHostnameSafe(getHost(item));
        inFlightByHost.set(host, (inFlightByHost.get(host) || 0) + 1);
        lastDispatchedAtByHost.set(host, Date.now());
        totalInFlight += 1;

        Promise.resolve()
          .then(() => worker(item))
          .finally(() => {
            totalInFlight -= 1;
            const remainingHost = (inFlightByHost.get(host) || 1) - 1;
            if (remainingHost <= 0) {
              inFlightByHost.delete(host);
            } else {
              inFlightByHost.set(host, remainingHost);
            }
            schedule();
          });
      }

      if (pending.length > 0 && totalInFlight < options.globalLimit && earliestRetryDelay !== null) {
        setTimeout(schedule, earliestRetryDelay);
      }
    };

    schedule();
  });
}

async function hydratePersistentState(workerEnv?: any): Promise<void> {
  const mergeEntries = (parsed: Record<string, StoredSourceState> | null | undefined) => {
    if (!parsed || typeof parsed !== 'object') return;
    for (const [id, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== 'object' || !entry.latest) continue;
      const cur = sourceStateStore.get(id);
      if (!cur || entry.lastAttemptAt > cur.lastAttemptAt) {
        sourceStateStore.set(id, {
          ...entry,
          lastKnownGood: entry.lastKnownGood || cur?.lastKnownGood,
        });
      } else if (!cur.lastKnownGood && entry.lastKnownGood) {
        cur.lastKnownGood = entry.lastKnownGood;
      }
    }
  };

  try {
    if (workerEnv?.STATS_KV && typeof workerEnv.STATS_KV.get === 'function') {
      const kvRaw = await workerEnv.STATS_KV.get(WORKER_KV_KEY, 'json');
      mergeEntries(kvRaw);
    }
  } catch {
    // KV opcional indisponível
  }

  try {
    const defaultCache = typeof caches !== 'undefined' ? (caches as any).default : undefined;
    if (defaultCache && typeof defaultCache.match === 'function') {
      const cachedRes = await defaultCache.match(new Request(WORKER_CACHE_KEY_URL));
      if (cachedRes) {
        const json = await cachedRes.json().catch(() => null);
        mergeEntries(json);
      }
    }
  } catch {
    // Cache API indisponível fora do ambiente edge
  }
}

async function persistStateStore(
  workerEnv?: any,
  workerCtx?: { waitUntil?: (p: Promise<any>) => void }
): Promise<void> {
  const payloadObj: Record<string, StoredSourceState> = {};
  sourceStateStore.forEach((v, k) => {
    payloadObj[k] = v;
  });
  const serialized = JSON.stringify(payloadObj);

  const tasks: Promise<any>[] = [];

  try {
    if (workerEnv?.STATS_KV && typeof workerEnv.STATS_KV.put === 'function') {
      tasks.push(workerEnv.STATS_KV.put(WORKER_KV_KEY, serialized, { expirationTtl: 86400 }));
    }
  } catch {
    // ignore KV write error
  }

  try {
    const defaultCache = typeof caches !== 'undefined' ? (caches as any).default : undefined;
    if (defaultCache && typeof defaultCache.put === 'function') {
      const res = new Response(serialized, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
      tasks.push(defaultCache.put(new Request(WORKER_CACHE_KEY_URL), res));
    }
  } catch {
    // ignore Cache API write error
  }

  if (tasks.length > 0) {
    const allPromise = Promise.allSettled(tasks);
    if (workerCtx && typeof workerCtx.waitUntil === 'function') {
      workerCtx.waitUntil(allPromise);
    } else {
      await allPromise;
    }
  }
}

export interface DetailedStatsOptions {
  itemsPerPage?: number;
  category?: string;
  type?: string;
  refresh?: boolean;
  workerEnv?: any;
  workerCtx?: { waitUntil?: (promise: Promise<any>) => void };
  maxSubrequests?: number;
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

  const isWorkersMode =
    isCloudflareWorkersRuntime() ||
    Boolean(options.workerEnv || options.workerCtx || typeof options.maxSubrequests === 'number');

  if (isWorkersMode) {
    await hydratePersistentState(options.workerEnv);
  }

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

  const now = Date.now();
  const sourcesNeedingProbe: Source[] = [];

  for (const src of targetSources) {
    const key = String(src.id);
    const existing = sourceStateStore.get(key);
    const isFresh = existing && now - existing.lastAttemptAt < existing.ttlMs;
    if (refresh || !isFresh) {
      sourcesNeedingProbe.push(src);
    }
  }

  let isCached = sourcesNeedingProbe.length === 0;
  let deferredSources = 0;

  if (sourcesNeedingProbe.length > 0) {
    // Priorizar fontes nunca consultadas ou mais antigas primeiro (permite preenchimento progressivo entre execuções no Workers)
    sourcesNeedingProbe.sort((a, b) => {
      const stateA = sourceStateStore.get(String(a.id));
      const stateB = sourceStateStore.get(String(b.id));
      const tsA = stateA ? stateA.lastAttemptAt : 0;
      const tsB = stateB ? stateB.lastAttemptAt : 0;
      return tsA - tsB;
    });

    const maxSubrequests = isWorkersMode ? (options.maxSubrequests ?? 38) : Infinity;
    let subrequestsUsed = 0;
    const dispatchReserveBuffer = isWorkersMode ? 4 : 0;

    const trackSubrequest = () => {
      subrequestsUsed += 1;
    };
    const shouldContinueSubrequests = () => subrequestsUsed < maxSubrequests;

    await runWithPerHostConcurrency(
      sourcesNeedingProbe,
      (src) => src.url,
      async (src) => {
        const key = String(src.id);
        const existing = sourceStateStore.get(key);

        if (isWorkersMode && subrequestsUsed >= maxSubrequests - dispatchReserveBuffer) {
          deferredSources += 1;
          return;
        }

        const outcome = await probeSingleSourceCount(src, itemsPerPage, refresh, {
          trackSubrequest,
          shouldContinueSubrequests,
          retryEnabled: !isWorkersMode || subrequestsUsed < maxSubrequests - 6,
        });

        const probeTime = Date.now();
        const isoNow = new Date(probeTime).toISOString();

        if (outcome.ok) {
          const validLkg: LastKnownGoodEntry = {
            totalNews: outcome.record.totalNews,
            lastSuccessfulCheck: isoNow,
            httpStatus: outcome.record.httpStatus,
            responseSize: outcome.record.responseSize,
            parsedItems: outcome.record.parsedItems,
            discardedItems: outcome.record.discardedItems,
          };

          sourceStateStore.set(key, {
            lastAttemptAt: probeTime,
            ttlMs: STATS_CACHE_TTL_MS,
            lastKnownGood: validLkg,
            latest: {
              ...outcome.record,
              lastSuccessfulCheck: isoNow,
              stale: false,
            },
          });
        } else if (existing?.lastKnownGood) {
          // Preserva último resultado válido (Last-Known-Good) marcando stale: true e mantendo status online
          const lkg = existing.lastKnownGood;
          sourceStateStore.set(key, {
            lastAttemptAt: probeTime,
            ttlMs: STALE_RETRY_TTL_MS,
            lastKnownGood: lkg,
            latest: {
              ...outcome.record,
              status: 'online',
              totalNews: lkg.totalNews,
              lastSuccessfulCheck: lkg.lastSuccessfulCheck,
              stale: true,
            },
          });
        } else {
          // Nunca houve sucesso anterior e falhou realmente
          sourceStateStore.set(key, {
            lastAttemptAt: probeTime,
            ttlMs: STALE_RETRY_TTL_MS,
            latest: {
              ...outcome.record,
              stale: false,
            },
          });
        }
      },
      {
        globalLimit: 8,
        perHostLimit: 3,
        staggerMs: 40,
      }
    );

    if (isWorkersMode) {
      await persistStateStore(options.workerEnv, options.workerCtx);
    }
  }

  const rawSources: RawSourceProbeRecord[] = targetSources.map((src) => {
    const key = String(src.id);
    const stored = sourceStateStore.get(key);
    if (stored) {
      return stored.latest;
    }

    return {
      id: src.id,
      category: src.category,
      type: src.type,
      active: Boolean(src.active),
      status: 'unavailable',
      totalNews: 0,
      httpStatus: null,
      errorReason: deferredSources > 0 ? 'deferred_subrequest_budget' : 'unavailable',
      stale: false,
    };
  });

  const allMediaSources = getAllMediaSources();

  const sourceReports: SourceNewsStatsItem[] = rawSources.map((src) => {
    const { meta, page, totalPages } = buildMetaAndPage(src.totalNews, itemsPerPage);
    return {
      id: src.id,
      category: src.category,
      type: src.type,
      active: src.active,
      status: src.status,
      totalNews: src.totalNews,
      totalPages,
      meta,
      page,
      _links: {
        self: { href: `${baseUrl}/api/news/${src.id}?page=1&limit=${itemsPerPage}` },
        news: { href: `${baseUrl}/api/news/${src.id}` },
        images: { href: `${baseUrl}/api/images/${src.id}` },
      },
      httpStatus: src.httpStatus ?? null,
      errorReason: src.errorReason ?? null,
      ...(src.responseSize !== undefined ? { responseSize: src.responseSize } : {}),
      ...(src.parsedItems !== undefined ? { parsedItems: src.parsedItems } : {}),
      ...(src.discardedItems !== undefined ? { discardedItems: src.discardedItems } : {}),
      ...(src.lastSuccessfulCheck ? { lastSuccessfulCheck: src.lastSuccessfulCheck } : {}),
      stale: Boolean(src.stale),
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
  const staleSources = sourceReports.filter((s) => s.stale).length;
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
      staleSources,
      ...(deferredSources > 0 ? { partialProbe: true, deferredSources } : { partialProbe: false }),
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
