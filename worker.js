import crypto from 'crypto';
import rawSourcesData from './app/data/sources.json';
import {
  getAllSources,
  getAllMediaSources,
  getCategories,
  getTypes,
  getStats,
  getSourceById,
  getMediaSourceById,
  getSourcesByCategory,
  getBaseUrl,
  getBaseDomain,
} from './lib/sources';
import { fetchSourceContent, fetchMediaContent } from './lib/content';
import { toCleanSource, paginateWithHateoas } from './lib/hateoas';
import { getOpenApiSpec } from './lib/openapi-spec';

function safeCompare(a, b) {
  if (!a || !b) return false;
  if (a.length > 512 || b.length > 512) return false;
  try {
    const ha = crypto.createHash('sha256').update(a.trim()).digest();
    const hb = crypto.createHash('sha256').update(b.trim()).digest();
    return crypto.timingSafeEqual(ha, hb);
  } catch {
    return a.trim() === b.trim();
  }
}

function validateKey(request, env) {
  const apiKey = (
    env?.API_KEY ||
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.CLOUDFLARE_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.api_key) ||
    ''
  ).trim();
  const revalSecret = (
    env?.REVALIDATE_SECRET ||
    (typeof process !== 'undefined' && process.env?.REVALIDATE_SECRET) ||
    ''
  ).trim();

  // Se nenhuma chave estiver configurada no servidor, negar
  if (!apiKey && !revalSecret) return false;

  let provided = '';
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) provided = auth.slice(7).trim();
  if (!provided) provided = (request.headers.get('x-api-key') || '').trim();
  if (!provided) {
    try {
      const u = new URL(request.url);
      provided = (u.searchParams.get('api_key') || u.searchParams.get('apiKey') || '').trim();
    } catch {}
  }
  if (!provided) return false;

  if (apiKey && safeCompare(provided, apiKey)) return true;
  if (revalSecret && safeCompare(provided, revalSecret)) return true;
  return false;
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      ...headers,
    },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function unauthorizedResponse() {
  return jsonResponse(
    {
      success: false,
      error: 'Unauthorized. Provide a valid API key via Authorization header (Bearer <key>), x-api-key header, or api_key query parameter.',
    },
    401
  );
}

function renderHomePage(baseUrl, baseDomain, sources, categories) {
  const sourcesJson = JSON.stringify(sources).replace(/</g, '\\u003c');
  const categoriesJson = JSON.stringify(categories).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News & Media Sources API - Documentação</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info { margin: 20px 0 !important; }
    .swagger-ui .scheme-container { background: #f8fafc !important; padding: 15px 0 !important; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen">
  <!-- Top Navigation -->
  <header class="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
          API
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight">News & Media Sources API</h1>
          <p class="text-xs text-blue-400">Gateway de Notícias & Mídias &middot; ${baseDomain}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="/docs" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors">
          RapiDoc UI
        </a>
        <a href="/api/openapi.json" target="_blank" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors">
          OpenAPI 3.0.3 Spec
        </a>
        <a href="/api/health" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 text-xs font-semibold">
          Health OK
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <div class="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-10 px-4 sm:px-6 border-b border-slate-700">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-medium">
        <span>🚀 80 Fontes Ativas Conectadas</span>
        <span>&middot;</span>
        <span>Suporte a WordPress REST API e Feeds RSS</span>
      </div>
      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
        Catálogo Unificado de Fontes, Artigos e Mídias
      </h2>
      <p class="text-sm text-slate-300 max-w-3xl leading-relaxed">
        API REST de alta performance desenvolvida para agregação jornalística em tempo real com sanitização automática, deduplicação de imagens, links HATEOAS e suporte multiplataforma.
      </p>
      <div class="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
        <div class="bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700">
          <span class="text-slate-400">Autenticação:</span> <strong class="text-white">Bearer &lt;key&gt;</strong> ou <strong class="text-white">x-api-key</strong>
        </div>
        <div class="bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700">
          <span class="text-slate-400">Domínio Base:</span> <code class="text-blue-300 font-mono">${baseUrl || baseDomain}</code>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content Tabs -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <div class="mb-6 flex border-b border-slate-200">
      <button id="tab-swagger-btn" onclick="switchTab('swagger')" class="px-5 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 transition-colors">
        Swagger UI (Testes Interativos)
      </button>
      <button id="tab-sources-btn" onclick="switchTab('sources')" class="px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">
        Explorador de Fontes (80)
      </button>
    </div>

    <!-- Swagger UI View -->
    <div id="view-swagger" class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div id="swagger-ui"></div>
    </div>

    <!-- Sources Explorer View -->
    <div id="view-sources" class="hidden space-y-6">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <input type="text" id="search-input" oninput="filterSources()" placeholder="Buscar por ID, categoria ou site..." class="w-full sm:w-80 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <select id="category-select" onchange="filterSources()" class="w-full sm:w-60 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todas as Categorias</option>
        </select>
      </div>

      <div id="sources-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
      <div id="pagination-controls" class="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-600"></div>
    </div>
  </main>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    const allSources = ${sourcesJson};
    const allCategories = ${categoriesJson};
    let currentFilterCategory = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const perPage = 18;

    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });

      const catSelect = document.getElementById('category-select');
      allCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
      });

      renderSourcesGrid();
    };

    function switchTab(tab) {
      const swaggerView = document.getElementById('view-swagger');
      const sourcesView = document.getElementById('view-sources');
      const swaggerBtn = document.getElementById('tab-swagger-btn');
      const sourcesBtn = document.getElementById('tab-sources-btn');

      if (tab === 'swagger') {
        swaggerView.classList.remove('hidden');
        sourcesView.classList.add('hidden');
        swaggerBtn.className = 'px-5 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 transition-colors';
        sourcesBtn.className = 'px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors';
      } else {
        swaggerView.classList.add('hidden');
        sourcesView.classList.remove('hidden');
        swaggerBtn.className = 'px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors';
        sourcesBtn.className = 'px-5 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 transition-colors';
      }
    }

    function filterSources() {
      searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
      currentFilterCategory = document.getElementById('category-select').value;
      currentPage = 1;
      renderSourcesGrid();
    }

    function renderSourcesGrid() {
      const grid = document.getElementById('sources-grid');
      const filtered = allSources.filter(s => {
        const matchesCat = currentFilterCategory === 'all' || s.category === currentFilterCategory;
        const matchesQuery = !searchQuery ||
          String(s.id).includes(searchQuery) ||
          s.category.toLowerCase().includes(searchQuery) ||
          (s.site && s.site.toLowerCase().includes(searchQuery));
        return matchesCat && matchesQuery;
      });

      const total = filtered.length;
      const totalPages = Math.ceil(total / perPage) || 1;
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * perPage;
      const paged = filtered.slice(start, start + perPage);

      grid.innerHTML = '';
      if (paged.length === 0) {
        grid.innerHTML = '<div class="col-span-3 py-12 text-center text-slate-400 text-sm">Nenhuma fonte encontrada com o filtro atual.</div>';
        return;
      }

      paged.forEach(s => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow';
        card.innerHTML = \`
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">
                \${s.category}
              </span>
              <h4 class="font-semibold text-slate-900 text-sm truncate">\${s.site || s.category}</h4>
            </div>
            <div class="text-right">
              <span class="text-[11px] font-mono text-slate-500 block">ID: \${s.id}</span>
              <span class="text-[10px] text-slate-400 font-mono uppercase">\${s.type}</span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono">
            <div class="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span class="truncate text-slate-700">/api/news/\${s.id}</span>
              <a href="/api/news/\${s.id}?limit=2" target="_blank" class="text-blue-600 hover:text-blue-800 font-sans font-semibold">Testar</a>
            </div>
            \${s.mediaUrl || s.type === 'wp-api' ? \`
            <div class="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span class="truncate text-slate-700">/api/images/\${s.id}</span>
              <a href="/api/images/\${s.id}?limit=2" target="_blank" class="text-emerald-600 hover:text-emerald-800 font-sans font-semibold">Mídias</a>
            </div>
            \` : ''}
          </div>
        \`;
        grid.appendChild(card);
      });

      const paginationEl = document.getElementById('pagination-controls');
      paginationEl.innerHTML = \`
        <div>Exibindo <strong>\${start + 1}-\${Math.min(start + perPage, total)}</strong> de <strong>\${total}</strong> fontes</div>
        <div class="flex items-center gap-2">
          <button onclick="changePage(-1)" \${currentPage <= 1 ? 'disabled class="opacity-40 px-3 py-1 bg-white border border-slate-200 rounded-lg"' : 'class="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"'}>Anterior</button>
          <span class="font-mono">\${currentPage} / \${totalPages}</span>
          <button onclick="changePage(1)" \${currentPage >= totalPages ? 'disabled class="opacity-40 px-3 py-1 bg-white border border-slate-200 rounded-lg"' : 'class="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"'}>Próxima</button>
        </div>
      \`;
    }

    function changePage(delta) {
      currentPage += delta;
      renderSourcesGrid();
    }
  </script>
</body>
</html>`;
}

function renderDocsPage(baseUrl, baseDomain) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RapiDoc - News & Media Sources API</title>
  <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="w-full h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
  <header class="flex-none bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4 sm:px-6 z-20 shadow-md text-white">
    <div class="flex items-center gap-3">
      <a href="/" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg">
        &larr; Voltar ao Swagger
      </a>
      <div class="h-4 w-px bg-slate-700 hidden sm:block"></div>
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          RD
        </div>
        <div>
          <h1 class="text-sm font-bold text-white tracking-tight leading-none">News & Media Sources API</h1>
          <p class="text-[10px] text-blue-400 font-medium tracking-wider mt-0.5">RapiDoc Documentation &middot; ${baseDomain}</p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <a href="/api/openapi.json" target="_blank" class="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
        OpenAPI Spec JSON
      </a>
    </div>
  </header>
  <main class="flex-1 w-full relative overflow-hidden bg-white">
    <rapi-doc
      spec-url="/api/openapi.json"
      theme="light"
      render-style="read"
      show-header="false"
      show-info="true"
      allow-server-selection="true"
      allow-authentication="true"
      allow-try="true"
      heading-text="News & Media Sources API"
      primary-color="#2563eb"
      bg-color="#ffffff"
      text-color="#1e293b"
      nav-bg-color="#f8fafc"
      nav-text-color="#334155"
      api-key-name="x-api-key"
      api-key-location="header"
      style="width: 100%; height: 100%; display: block;"
    ></rapi-doc>
  </main>
</body>
</html>`;
}

const worker = {
  async fetch(request, env, ctx) {
    try {
      // 1. Injetar variáveis do Cloudflare Worker no process.env e globalThis
    if (env && typeof env === 'object') {
      try {
        if (typeof globalThis !== 'undefined') {
          globalThis.env = env;
          if (env.API_KEY) globalThis.API_KEY = env.API_KEY;
        }
        if (typeof process !== 'undefined' && process.env) {
          for (const [key, value] of Object.entries(env)) {
            if (typeof value === 'string') {
              process.env[key] = value;
            }
          }
        }
      } catch {}
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // 2. Tratar requisições OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }

    // 3. Tentar servir assets estáticos primeiro se for asset específico
    if (
      env?.ASSETS &&
      typeof env.ASSETS.fetch === 'function' &&
      (pathname.startsWith('/_next/') || pathname.startsWith('/assets/') || pathname.includes('.'))
    ) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    const baseUrl = getBaseUrl(request);
    const baseDomain = getBaseDomain(request);

    // 4. FRONTEND: Rota Raiz (/) -> Renderiza Swagger UI + Sources Explorer
    if (pathname === '/' || pathname === '/index.html') {
      const sources = getAllSources(request);
      const categories = getCategories().map((c) => c.category);
      return htmlResponse(renderHomePage(baseUrl, baseDomain, sources, categories));
    }

    // 5. FRONTEND: Rota de Documentação RapiDoc (/docs)
    if (pathname === '/docs' || pathname === '/docs/') {
      return htmlResponse(renderDocsPage(baseUrl, baseDomain));
    }

    // 6. ENDPOINT: Health Check (/api/health)
    if (pathname === '/api/health') {
      return jsonResponse({
        status: 'ok',
        uptime: typeof process !== 'undefined' ? process.uptime?.() || 0 : 0,
        timestamp: new Date().toISOString(),
        platform: 'cloudflare-worker',
      });
    }

    // 7. ENDPOINT: OpenAPI Specification JSON (/api/openapi.json ou /openapi.json)
    if (pathname === '/api/openapi.json' || pathname === '/openapi.json') {
      const spec = getOpenApiSpec(request);
      return jsonResponse(spec);
    }

    // 8. ENDPOINT: Version (/api/version ou /version)
    if (pathname === '/api/version' || pathname === '/version') {
      return jsonResponse({
        version: '1.0.0',
        buildId:
          (typeof process !== 'undefined' && (process.env.BUILD_ID || process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12))) ||
          'v1.0.0-release',
        timestamp: new Date().toISOString(),
      });
    }

    // 9. ENDPOINT: Categorias (/api/categories ou /categories)
    if (pathname === '/api/categories' || pathname === '/categories') {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const categories = getCategories(request);
      return jsonResponse({
        success: true,
        data: categories,
        meta: { total: categories.length },
      });
    }

    // 10. ENDPOINT: Tipos de protocolo (/api/types ou /types)
    if (pathname === '/api/types' || pathname === '/types') {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const types = getTypes(request);
      return jsonResponse({
        success: true,
        data: types,
        meta: { total: types.length },
      });
    }

    // 11. ENDPOINT: Estatísticas (/api/stats ou /stats)
    if (pathname === '/api/stats' || pathname === '/stats') {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const stats = getStats(request);
      return jsonResponse({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        data: stats,
      });
    }

    // 12. ENDPOINT: Lista de Mídias (/api/images ou /images)
    if (pathname === '/api/images' || pathname === '/images') {
      if (!validateKey(request, env)) return unauthorizedResponse();

      const format = url.searchParams.get('format');
      const idParam = url.searchParams.get('id');

      // Se for consulta com ?id=, busca conteúdo da fonte
      if (idParam) {
        const source = getMediaSourceById(idParam) || getSourceById(idParam);
        if (!source) {
          return jsonResponse({ success: false, error: `Image source with id '${idParam}' not found.` }, 404);
        }
        const metaOnly = url.searchParams.get('meta') === 'true';
        if (metaOnly) {
          return jsonResponse(toCleanSource(source, baseUrl));
        }

        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
        const limit = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
        const search = url.searchParams.get('search') || '';

        try {
          const data = await fetchMediaContent(source, { page, limit, search: search || undefined });

          const itemsWithHateoas = (data.items || []).map((item) => ({
            ...item,
            category: item.category || source.category,
            categories: item.categories || (source.category ? [source.category] : ['Geral']),
            source: item.source || source.category,
            sourceId: item.sourceId || source.id,
            imageUrl: item.imageUrl || item.image,
            image: item.image || item.imageUrl,
            _links: {
              self: { href: `${baseUrl}/api/images/${source.id}?page=${page}` },
              news: { href: `${baseUrl}/api/news/${source.id}` },
              source: { href: `${baseUrl}/api/images/${source.id}` },
            },
          }));

          const hateoasResult = paginateWithHateoas(
            itemsWithHateoas,
            data.pagination.total,
            data.pagination.page,
            data.pagination.limit,
            `${baseUrl}/api/images/${source.id}`,
            { search },
            {
              images: { href: `${baseUrl}/api/images` },
              news: { href: `${baseUrl}/api/news/${source.id}` },
            }
          );

          const headers = {
            'X-WP-Total': data.pagination.total.toString(),
            'X-WP-TotalPages': data.pagination.totalPages.toString(),
          };

          if (format === 'array') {
            return jsonResponse(hateoasResult.items, 200, headers);
          }
          return jsonResponse(hateoasResult, 200, headers);
        } catch (error) {
          return jsonResponse(
            { success: false, error: error.message, sourceId: source.id },
            502
          );
        }
      }

      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
      const limit = parseInt(limitParam, 10);
      const activeParam = url.searchParams.get('active');
      let mediaSources = getAllMediaSources(request);

      if (activeParam !== null && activeParam !== undefined && activeParam !== '') {
        const isActive = activeParam.toLowerCase() === 'true';
        mediaSources = mediaSources.filter((s) => s.active === isActive);
      }

      const cleanSources = mediaSources.map((s) => toCleanSource(s, baseUrl));
      const total = cleanSources.length;
      const safePage = Math.max(1, page || 1);
      const safeLimit = Math.max(1, limit || 100);
      const start = (safePage - 1) * safeLimit;
      const paged = cleanSources.slice(start, start + safeLimit);

      const hateoas = paginateWithHateoas(
        paged,
        total,
        safePage,
        safeLimit,
        `${baseUrl}/api/images`,
        {
          active: activeParam || undefined,
        },
        {
          news: { href: `${baseUrl}/api/news` },
          categories: { href: `${baseUrl}/api/categories` },
          stats: { href: `${baseUrl}/api/stats` },
        }
      );

      const headers = {
        'X-WP-Total': String(hateoas.meta.totalItems),
        'X-WP-TotalPages': String(hateoas.meta.totalPages),
      };

      if (format === 'array') {
        return jsonResponse(hateoas.items, 200, headers);
      }
      return jsonResponse(hateoas, 200, headers);
    }

    // 13. ENDPOINT: Mídias por ID (/api/images/:id ou /images/:id)
    const imagesMatch = pathname.match(/^\/(?:api\/)?images\/(\d+)/);
    if (imagesMatch) {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const id = imagesMatch[1];
      const source = getMediaSourceById(id) || getSourceById(id);
      if (!source) {
        return jsonResponse({ success: false, error: `Image source with id '${id}' not found.` }, 404);
      }
      const metaOnly = url.searchParams.get('meta') === 'true';
      if (metaOnly) {
        return jsonResponse(toCleanSource(source, baseUrl));
      }

      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
      const limit = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
      const search = url.searchParams.get('search') || '';
      const format = url.searchParams.get('format');

      try {
        const data = await fetchMediaContent(source, { page, limit, search: search || undefined });

        const itemsWithHateoas = (data.items || []).map((item) => ({
          ...item,
          category: item.category || source.category,
          categories: item.categories || (source.category ? [source.category] : ['Geral']),
          source: item.source || source.category,
          sourceId: item.sourceId || source.id,
          imageUrl: item.imageUrl || item.image,
          image: item.image || item.imageUrl,
          _links: {
            self: { href: `${baseUrl}/api/images/${source.id}?page=${page}` },
            news: { href: `${baseUrl}/api/news/${source.id}` },
            source: { href: `${baseUrl}/api/images/${source.id}` },
          },
        }));

        const hateoasResult = paginateWithHateoas(
          itemsWithHateoas,
          data.pagination.total,
          data.pagination.page,
          data.pagination.limit,
          `${baseUrl}/api/images/${source.id}`,
          { search },
          {
            images: { href: `${baseUrl}/api/images` },
            news: { href: `${baseUrl}/api/news/${source.id}` },
            source: { href: `${baseUrl}/api/images/${source.id}` },
          }
        );

        const headers = {
          'X-WP-Total': data.pagination.total.toString(),
          'X-WP-TotalPages': data.pagination.totalPages.toString(),
        };

        if (format === 'array') {
          return jsonResponse(hateoasResult.items, 200, headers);
        }
        return jsonResponse(hateoasResult, 200, headers);
      } catch (error) {
        return jsonResponse(
          { success: false, error: error.message, sourceId: source.id },
          502
        );
      }
    }

    // 14. ENDPOINT: Notícias por Categoria (/api/news/category/:category)
    const newsCatMatch = pathname.match(/^\/(?:api\/)?news\/category\/([^/]+)/);
    if (newsCatMatch) {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const cat = decodeURIComponent(newsCatMatch[1]);
      const sources = getSourcesByCategory(cat, request);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
      const limit = parseInt(limitParam, 10);
      const isFeed = url.searchParams.get('feed') === 'true' || url.searchParams.get('articles') === 'true';

      if (isFeed) {
        const activeSources = sources.filter((s) => s.active);
        const articlesLimit = Math.min(30, Math.max(1, limit || 20));
        const categoryArticles = [];
        for (const src of activeSources.slice(0, 5)) {
          try {
            const res = await fetchSourceContent(src, { page: 1, limit: 10, search: '' });
            if (res && Array.isArray(res.items)) {
              categoryArticles.push(...res.items);
            }
          } catch {}
        }
        const safePage = Math.max(1, page || 1);
        const start = (safePage - 1) * articlesLimit;
        const paged = categoryArticles.slice(start, start + articlesLimit);
        const total = categoryArticles.length;
        const totalPages = Math.ceil(total / articlesLimit) || 1;
        return jsonResponse(paged, 200, {
          'X-WP-Total': String(total),
          'X-WP-TotalPages': String(totalPages),
        });
      }

      const mappedSources = sources.map((s) => toCleanSource(s, baseUrl, true));
      const safePage = Math.max(1, page || 1);
      const safeLimit = Math.max(1, limit || 100);
      const start = (safePage - 1) * safeLimit;
      const paged = mappedSources.slice(start, start + safeLimit);
      const total = mappedSources.length;
      const totalPages = Math.ceil(total / safeLimit) || 1;

      return jsonResponse(paged, 200, {
        'X-WP-Total': String(total),
        'X-WP-TotalPages': String(totalPages),
      });
    }

    // 15. ENDPOINT: Notícias por ID (/api/news/:id ou /news/:id)
    const newsIdMatch = pathname.match(/^\/(?:api\/)?news\/(\d+)/);
    if (newsIdMatch) {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const id = newsIdMatch[1];
      const source = getSourceById(id);
      if (!source) {
        return jsonResponse({ success: false, error: `News source with id '${id}' not found.` }, 404);
      }
      const metaOnly = url.searchParams.get('meta') === 'true';
      if (metaOnly) {
        return jsonResponse(toCleanSource(source, baseUrl));
      }

      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
      const limit = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
      const search = url.searchParams.get('search') || '';
      const format = url.searchParams.get('format');

      try {
        const data = await fetchSourceContent(source, { page, limit, search: search || undefined });

        // Vincular links HATEOAS e garantir campos de imagem, categoria e fonte a cada matéria individual
        const itemsWithHateoas = (data.items || []).map((item) => ({
          ...item,
          category: item.category || source.category,
          categories: item.categories || (source.category ? [source.category] : ['Geral']),
          source: item.source || source.category,
          sourceId: item.sourceId || source.id,
          imageUrl: item.imageUrl || item.image,
          image: item.image || item.imageUrl,
          _links: {
            self: { href: `${baseUrl}/api/news/${source.id}?page=${page}` },
            source: { href: `${baseUrl}/api/news/${source.id}` },
            images: { href: `${baseUrl}/api/images/${source.id}` },
          },
        }));

        const hateoasResult = paginateWithHateoas(
          itemsWithHateoas,
          data.pagination.total,
          data.pagination.page,
          data.pagination.limit,
          `${baseUrl}/api/news/${source.id}`,
          { search },
          {
            news: { href: `${baseUrl}/api/news` },
            source: { href: `${baseUrl}/api/news/${source.id}` },
            images: { href: `${baseUrl}/api/images/${source.id}` },
          }
        );

        const headers = {
          'X-WP-Total': data.pagination.total.toString(),
          'X-WP-TotalPages': data.pagination.totalPages.toString(),
        };

        if (format === 'array') {
          return jsonResponse(hateoasResult.items, 200, headers);
        }
        return jsonResponse(hateoasResult, 200, headers);
      } catch (error) {
        return jsonResponse(
          { success: false, error: error.message, sourceId: source.id },
          502
        );
      }
    }

    // 16. ENDPOINT: Lista de Notícias/Fontes (/api/news ou /news)
    if (pathname === '/api/news' || pathname === '/news') {
      if (!validateKey(request, env)) return unauthorizedResponse();

      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || url.searchParams.get('per_page') || '100', 10);
      const category = url.searchParams.get('category');
      const type = url.searchParams.get('type');
      const active = url.searchParams.get('active');
      const format = url.searchParams.get('format');

      let sources = getAllSources(request);
      if (category) sources = getSourcesByCategory(category, request);
      if (type) sources = sources.filter((s) => s.type === type);
      if (active !== null && active !== undefined && active !== '') {
        sources = sources.filter((s) => s.active === (active === 'true'));
      }

      const cleanSources = sources.map((s) => toCleanSource(s, baseUrl));
      const total = cleanSources.length;
      const safePage = Math.max(1, page || 1);
      const safeLimit = Math.max(1, limit || 100);
      const start = (safePage - 1) * safeLimit;
      const paged = cleanSources.slice(start, start + safeLimit);

      const hateoas = paginateWithHateoas(
        paged,
        total,
        safePage,
        safeLimit,
        `${baseUrl}/api/news`,
        { category, type, active },
        {
          categories: { href: `${baseUrl}/api/categories` },
          images: { href: `${baseUrl}/api/images` },
          stats: { href: `${baseUrl}/api/stats` },
        }
      );

      const headers = {
        'X-WP-Total': String(hateoas.meta.totalItems),
        'X-WP-TotalPages': String(hateoas.meta.totalPages),
      };

      if (format === 'array') {
        return jsonResponse(hateoas.items, 200, headers);
      }
      return jsonResponse(hateoas, 200, headers);
    }

    // 17. ENDPOINT: Revalidate Cache (/api/revalidate ou /revalidate)
    if (pathname === '/api/revalidate' || pathname === '/revalidate') {
      const revalSecret = (
        env?.REVALIDATE_SECRET ||
        (typeof process !== 'undefined' && process.env?.REVALIDATE_SECRET) ||
        ''
      ).trim();
      let providedSecret = url.searchParams.get('secret') || url.searchParams.get('key') || '';
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) providedSecret = authHeader.slice(7).trim();
      if (!providedSecret) providedSecret = (request.headers.get('x-revalidate-secret') || '').trim();

      let body = {};
      if (request.method === 'POST') {
        try {
          body = await request.json();
          if (!providedSecret && body?.secret) providedSecret = String(body.secret).trim();
        } catch {}
      }

      if (!revalSecret || !safeCompare(providedSecret, revalSecret)) {
        return jsonResponse(
          { revalidated: false, error: 'Invalid or missing revalidation secret token.' },
          401
        );
      }

      return jsonResponse({
        revalidated: true,
        targets: ['all edge cache and worker memory'],
        now: Date.now(),
        timestamp: new Date().toISOString(),
        message: 'Revalidação Cloudflare concluída com sucesso.',
      });
    }

    // 17. Tentar fallback de assets
    if (env?.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

      return jsonResponse({ success: false, error: `Endpoint ${pathname} not found` }, 404);
    } catch (err) {
      console.error('[Cloudflare Worker Error]', err);
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/') || url.pathname.endsWith('.json')) {
        return jsonResponse(
          {
            success: false,
            error: err?.message || 'Internal Worker Error',
            stack: err?.stack || undefined,
          },
          500
        );
      }
      return htmlResponse(
        `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>News & Media Sources API - Worker Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 2rem; max-width: 800px; margin: 2rem auto; border: 1px solid #334155; }
    h1 { color: #f43f5e; margin-top: 0; }
    pre { background: #020617; padding: 1rem; border-radius: 8px; overflow-x: auto; color: #94a3b8; }
    a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Erro no Processamento do Worker</h1>
    <p>${err?.message || 'Ocorreu um erro interno na inicialização da página.'}</p>
    <pre>${err?.stack || 'Sem rastreamento disponível'}</pre>
    <p><a href="/">← Voltar para o Início</a> | <a href="/api/health">Status da API</a></p>
  </div>
</body>
</html>`,
        500
      );
    }
  },
};

export default worker;
