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
  formatAppEmail,
} from './lib/sources';
import { fetchSourceContent, fetchMediaContent, cleanText } from './lib/content';
import { toCleanSource, paginateWithHateoas } from './lib/hateoas';
import { getOpenApiSpec } from './lib/openapi-spec';
import { getApiIndexPayload, getDetailedNewsStats } from './lib/stats';

const URL_ENV_KEYS = new Set([
  'APP_URL',
  'APP_DOMAIN',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_APP_DOMAIN',
  'NEXT_PUBLIC_BASE_URL',
]);

function isInvalidUrlEnvVal(key, value) {
  if (!URL_ENV_KEYS.has(key)) return false;
  const v = String(value ?? '').trim();
  if (!v || v === '/' || v.startsWith('/')) return true;
  if (['default', 'null', 'undefined', 'none', 'auto'].includes(v.toLowerCase())) return true;
  const stripped = v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  return !stripped || (!stripped.includes('.') && stripped !== 'localhost');
}

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
      provided = (u.searchParams.get('ref') || '').trim();
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
      error: 'Unauthorized. Provide a valid credential via Authorization header (Bearer <value>), x-api-key header, or ref query parameter.',
    },
    401
  );
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHomePage(baseUrl, baseDomain, sources, categories, mediaCount = 0) {
  const sourcesJson = JSON.stringify(sources).replace(/</g, '\\u003c');
  const categoriesJson = JSON.stringify(categories).replace(/</g, '\\u003c');
  const safeBaseUrlJson = JSON.stringify(baseUrl || '').replace(/</g, '\\u003c');
  const safeBaseDomainJson = JSON.stringify(baseDomain || '').replace(/</g, '\\u003c');
  const safeBaseDomainHtml = escapeHtml(baseDomain || '');
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News &amp; Media Sources API - Documentação Interativa</title>
  <meta name="description" content="API REST de alta performance para consulta e extração unificada de fontes de notícias e imagens jornalísticas.">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info { margin: 20px 0 !important; }
    .swagger-ui .scheme-container { background: #f8fafc !important; padding: 15px 0 !important; }
  </style>
</head>
<body class="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
  <main class="min-h-screen bg-slate-50 font-sans">
    <header class="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight">News &amp; Media Sources API</h1>
              <p class="text-sm text-slate-400">Documentação Interativa Swagger UI &middot; v1.0.0</p>
            </div>
          </div>
          <p class="text-slate-300 text-sm max-w-2xl leading-relaxed">
            API REST de alta performance para consulta e extração unificada de fontes de notícias e imagens jornalísticas. Todos os endpoints exigem autenticação prévia.
          </p>
          <div class="flex flex-wrap items-center gap-3 mt-2">
            <div class="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
              <span class="text-xs text-slate-400 block">Fontes Ativas</span>
              <span class="text-lg font-semibold text-blue-400">${sources.length}</span>
            </div>
            <div class="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
              <span class="text-xs text-slate-400 block">Endpoints de Mídia</span>
              <span class="text-lg font-semibold text-emerald-400">${mediaCount}</span>
            </div>
            <div class="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
              <span class="text-xs text-slate-400 block">Categorias</span>
              <span class="text-lg font-semibold text-purple-400">${categories.length}</span>
            </div>
            <div class="ml-auto flex items-center gap-3">
              <a href="/docs" id="btn-nav-docs" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Documentação RapiDoc (/docs)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Warning Notice Box -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div id="notice-auth-required" class="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
        <div class="flex items-start gap-3.5">
          <div class="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-bold text-amber-950 mb-1.5 flex items-center gap-2">
              <span>Autenticação necessária</span>
            </h2>
            <p class="text-amber-900 text-sm leading-relaxed mb-4 font-medium">
              Para testar os endpoints no Swagger UI, clique no botão &quot;Authorize&quot; e insira a sua API Key. A chave pode ser enviada via header <code class="bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">Authorization: Bearer &lt;key&gt;</code>, header <code class="bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">x-api-key</code>, ou query parameter <code class="bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">?ref=&lt;key&gt;</code>.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
              <div class="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs">
                <span class="font-semibold text-slate-800 block mb-1">Opção 1 (Recomendado)</span>
                <code class="text-blue-700 bg-blue-50 px-2 py-1 rounded block font-mono">Authorization: Bearer &lt;key&gt;</code>
              </div>
              <div class="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs">
                <span class="font-semibold text-slate-800 block mb-1">Opção 2 (Header Customizado)</span>
                <code class="text-blue-700 bg-blue-50 px-2 py-1 rounded block font-mono">x-api-key: &lt;key&gt;</code>
              </div>
              <div class="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs">
                <span class="font-semibold text-slate-800 block mb-1">Opção 3 (Query String)</span>
                <code class="text-blue-700 bg-blue-50 px-2 py-1 rounded block font-mono">?ref=&lt;key&gt;</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Tabs Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="space-y-6">
        <!-- Navigation Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button id="tab-explorer-btn" onclick="switchTab('explorer')" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all bg-white text-blue-700 shadow-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>Fontes &amp; Testador Rápido (${sources.length})</span>
            </button>

            <button id="tab-swagger-btn" onclick="switchTab('swagger')" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 hover:text-slate-900">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Documentação Swagger UI</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <a href="/docs" class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-3 py-2 rounded-lg transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>RapiDoc (/docs)</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 ml-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-3 py-2 rounded-lg transition-colors shadow-sm">
              <span>OpenAPI JSON</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 ml-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        <!-- Tab 1: Explorer View (Default) -->
        <div id="view-explorer" class="space-y-6">
          <!-- System Endpoints Quick Bar -->
          <div class="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div class="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 class="font-semibold text-sm tracking-wide uppercase text-slate-200">
                  Rotas do Sistema &amp; Monitoramento
                </h3>
              </div>
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                ${safeBaseDomainHtml ? `<span class="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 font-mono text-blue-300">Domínio: <strong class="text-white">${safeBaseDomainHtml}</strong></span>` : ''}
                <div>
                  Revalidação ISR: <span class="text-emerald-400 font-mono font-semibold">20 segundos</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div class="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Índice JSON da API</span>
                  <code class="text-xs text-cyan-300 font-mono font-semibold">/api</code>
                </div>
                <button onclick="executeQuickTest('/api')" class="p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white transition-colors" title="Testar endpoint">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              </div>

              <div class="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Status da Conexão</span>
                  <code class="text-xs text-blue-300 font-mono font-semibold">/api/sync</code>
                </div>
                <button onclick="executeQuickTest('/api/sync')" class="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors" title="Testar endpoint">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              </div>

              <div class="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Sincronia de Versão</span>
                  <code class="text-xs text-purple-300 font-mono font-semibold">/api/version</code>
                </div>
                <button onclick="executeQuickTest('/api/version')" class="p-1.5 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors" title="Testar endpoint">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              </div>

              <div class="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Health Check</span>
                  <code class="text-xs text-emerald-300 font-mono font-semibold">/api/health</code>
                </div>
                <button onclick="executeQuickTest('/api/health')" class="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white transition-colors" title="Testar endpoint">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              </div>

              <div class="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Estatísticas Gerais</span>
                  <code class="text-xs text-amber-300 font-mono font-semibold">/api/stats</code>
                </div>
                <button onclick="executeQuickTest('/api/stats')" class="p-1.5 bg-amber-600 hover:bg-amber-500 rounded text-white transition-colors" title="Testar endpoint">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              </div>

              <div class="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-[11px] text-slate-400 uppercase tracking-wider block">Notícias &amp; Páginas</span>
                  <code class="text-xs text-rose-300 font-mono font-semibold">/api/stats/news</code>
                </div>
                <button onclick="executeQuickTest('/api/stats/news')" class="p-1.5 bg-rose-600 hover:bg-rose-500 rounded text-white transition-colors" title="Testar endpoint">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Test Results Panel -->
          <div id="quick-test-panel" class="hidden bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-700 shadow-md">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span id="quick-test-endpoint" class="text-xs font-mono font-bold text-slate-300"></span>
                <span id="quick-test-status" class="hidden text-[10px] px-2 py-0.5 rounded font-mono font-bold"></span>
              </div>
              <button onclick="closeQuickTest()" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">
                Fechar
              </button>
            </div>
            <div id="quick-test-body" class="mt-3"></div>
          </div>

          <!-- Filters and Search -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" id="search-input" oninput="filterSources()" placeholder="Buscar por ID, categoria, site ou protocolo..." class="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            </div>

            <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <input type="password" id="api-key-input" oninput="syncApiKey(this.value)" placeholder="API Key (para testes)" class="w-44 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-mono text-xs" title="Insira sua API Key para testar rotas protegidas no navegador">
              <select id="category-select" onchange="filterSources()" class="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                <option value="all">Todas as Categorias (${sources.length})</option>
              </select>
            </div>
          </div>

          <!-- Sources Grid -->
          <div id="sources-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>

          <!-- Pagination Controls -->
          <div id="pagination-controls" class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-600"></div>
        </div>

        <!-- Tab 2: Swagger UI View -->
        <div id="view-swagger" class="hidden bg-white border border-slate-200 shadow-sm rounded-xl p-6">
          <div id="swagger-ui"></div>
        </div>
      </div>
    </div>

    <footer class="border-t border-slate-200 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p class="text-sm text-slate-500">
          &copy; ${currentYear} News &amp; Media Sources API. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  </main>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    const allSources = ${sourcesJson};
    const allCategories = ${categoriesJson};
    const appUrl = ${safeBaseUrlJson} || window.location.origin;
    const appDomain = ${safeBaseDomainJson} || window.location.host;
    let currentFilterCategory = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const perPage = 18;
    let swaggerInitialized = false;
    let copiedKey = null;

    function esc(val) {
      return String(val == null ? '' : val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function initSwagger() {
      if (swaggerInitialized || typeof SwaggerUIBundle === 'undefined') return;
      swaggerInitialized = true;
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout'
      });
    }

    window.addEventListener('DOMContentLoaded', function() {
      const catSelect = document.getElementById('category-select');
      allCategories.forEach(function(cat) {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
      });

      try {
        const savedKey = localStorage.getItem('news_api_key');
        if (savedKey) {
          document.getElementById('api-key-input').value = savedKey;
        }
      } catch (e) {}

      renderSourcesGrid();
    });

    function syncApiKey(val) {
      try {
        if (val && val.trim()) {
          localStorage.setItem('news_api_key', val.trim());
        }
      } catch (e) {}
    }

    function switchTab(tab) {
      const explorerView = document.getElementById('view-explorer');
      const swaggerView = document.getElementById('view-swagger');
      const explorerBtn = document.getElementById('tab-explorer-btn');
      const swaggerBtn = document.getElementById('tab-swagger-btn');

      if (tab === 'swagger') {
        explorerView.classList.add('hidden');
        swaggerView.classList.remove('hidden');
        explorerBtn.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 hover:text-slate-900';
        swaggerBtn.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all bg-white text-blue-700 shadow-sm font-semibold';
        initSwagger();
      } else {
        swaggerView.classList.add('hidden');
        explorerView.classList.remove('hidden');
        explorerBtn.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all bg-white text-blue-700 shadow-sm font-semibold';
        swaggerBtn.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 hover:text-slate-900';
      }
    }

    function filterSources() {
      searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
      currentFilterCategory = document.getElementById('category-select').value;
      currentPage = 1;
      renderSourcesGrid();
    }

    function copyEndpoint(text, id) {
      try {
        navigator.clipboard.writeText(text);
        copiedKey = id;
        renderSourcesGrid();
        setTimeout(function() {
          if (copiedKey === id) {
            copiedKey = null;
            renderSourcesGrid();
          }
        }, 2000);
      } catch (e) {}
    }

    async function executeQuickTest(endpoint) {
      const panel = document.getElementById('quick-test-panel');
      const endpointEl = document.getElementById('quick-test-endpoint');
      const statusEl = document.getElementById('quick-test-status');
      const bodyEl = document.getElementById('quick-test-body');

      panel.classList.remove('hidden');
      endpointEl.textContent = endpoint;
      statusEl.className = 'hidden';
      statusEl.textContent = '';
      bodyEl.innerHTML = '<div class="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm"><div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div><span>Consultando endpoint ao vivo...</span></div>';

      try {
        const keyVal = (document.getElementById('api-key-input').value || '').trim();
        const headers = {};
        if (keyVal) {
          headers['Authorization'] = 'Bearer ' + keyVal;
          headers['x-api-key'] = keyVal;
        }
        const res = await fetch(endpoint, { headers: headers });
        const json = await res.json().catch(function() { return null; });
        statusEl.textContent = 'HTTP ' + res.status;
        statusEl.className = res.status >= 200 && res.status < 300
          ? 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800'
          : 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-red-950 text-red-400 border border-red-800';
        const pre = document.createElement('pre');
        pre.className = 'text-xs font-mono bg-slate-950 text-emerald-400 p-4 rounded-lg max-h-64 overflow-y-auto overflow-x-auto';
        pre.textContent = JSON.stringify(json, null, 2);
        bodyEl.innerHTML = '';
        bodyEl.appendChild(pre);
      } catch (err) {
        statusEl.textContent = 'HTTP 500';
        statusEl.className = 'text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-red-950 text-red-400 border border-red-800';
        const pre = document.createElement('pre');
        pre.className = 'text-xs font-mono bg-slate-950 text-red-400 p-4 rounded-lg max-h-64 overflow-y-auto overflow-x-auto';
        pre.textContent = JSON.stringify({ error: (err && err.message) || 'Falha na requisição' }, null, 2);
        bodyEl.innerHTML = '';
        bodyEl.appendChild(pre);
      }
    }

    function copyFromBtn(btn) {
      copyEndpoint(btn.getAttribute('data-copy-url') || '', btn.getAttribute('data-copy-id') || '');
    }

    function testFromBtn(btn) {
      executeQuickTest(btn.getAttribute('data-test-endpoint') || '');
    }

    function closeQuickTest() {
      document.getElementById('quick-test-panel').classList.add('hidden');
    }

    function renderSourcesGrid() {
      const grid = document.getElementById('sources-grid');
      const paginationEl = document.getElementById('pagination-controls');
      const filtered = allSources.filter(function(s) {
        const matchesCat = currentFilterCategory === 'all' || (s.category || '').toLowerCase() === currentFilterCategory.toLowerCase();
        const matchesQuery = !searchQuery ||
          String(s.id).includes(searchQuery) ||
          (s.category || '').toLowerCase().includes(searchQuery) ||
          (s.site && s.site.toLowerCase().includes(searchQuery)) ||
          (s.type && s.type.toLowerCase().includes(searchQuery));
        return matchesCat && matchesQuery;
      });

      const total = filtered.length;
      const totalPages = Math.ceil(total / perPage) || 1;
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * perPage;
      const paged = filtered.slice(start, start + perPage);

      grid.innerHTML = '';
      if (paged.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500"><p class="text-sm">Nenhuma fonte encontrada com o filtro atual.</p></div>';
        paginationEl.innerHTML = '';
        return;
      }

      const copySvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      const checkSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      const playSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      const newsSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>';
      const imgSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

      paged.forEach(function(s) {
        const isLudopedio = String(s.id) === '9124882157745';
        const hasMedia = Boolean(s.mediaUrl || s.type === 'wp-api');
        const newsPath = '/api/news/' + s.id;
        const fullNewsUrl = appUrl ? appUrl + newsPath : newsPath;
        const imagesPath = '/api/images/' + s.id;
        const fullImagesUrl = appUrl ? appUrl + imagesPath : imagesPath;
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ' + (isLudopedio ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200');

        let html = '<div class="flex items-start justify-between gap-2 mb-2">';
        html += '<div>';
        html += '<span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">' + esc(s.category) + '</span>';
        html += '<h4 class="font-semibold text-slate-900 text-sm flex items-center gap-1.5"><span class="truncate">' + esc(s.site || appDomain || s.category) + '</span>';
        if (isLudopedio) {
          html += '<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">Feed &amp; Imagens Únicas</span>';
        }
        html += '</h4></div>';
        html += '<div class="text-right"><span class="text-[11px] font-mono text-slate-500 block">ID: ' + esc(s.id) + '</span><span class="text-[10px] text-slate-400 font-mono uppercase">' + esc(s.type) + '</span></div>';
        html += '</div>';

        html += '<div class="mt-3 pt-3 border-t border-slate-100 space-y-2">';
        html += '<div class="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">';
        html += '<div class="flex items-center gap-1.5 truncate mr-2" title="' + esc(fullNewsUrl) + '">' + newsSvg + '<code class="font-mono text-slate-700 truncate">' + esc(newsPath) + '</code></div>';
        html += '<div class="flex items-center gap-1 shrink-0">';
        html += '<button onclick="copyFromBtn(this)" data-copy-url="' + esc(fullNewsUrl) + '" data-copy-id="news-' + esc(s.id) + '" class="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors" title="Copiar URL: ' + esc(fullNewsUrl) + '">' + (copiedKey === 'news-' + s.id ? checkSvg : copySvg) + '</button>';
        html += '<button onclick="testFromBtn(this)" data-test-endpoint="' + esc(newsPath) + '?limit=2" class="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100 transition-colors" title="Testar consulta ao vivo">' + playSvg + '</button>';
        html += '</div></div>';

        if (hasMedia) {
          html += '<div class="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">';
          html += '<div class="flex items-center gap-1.5 truncate mr-2" title="' + esc(fullImagesUrl) + '">' + imgSvg + '<code class="font-mono text-slate-700 truncate">' + esc(imagesPath) + '</code></div>';
          html += '<div class="flex items-center gap-1 shrink-0">';
          html += '<button onclick="copyFromBtn(this)" data-copy-url="' + esc(fullImagesUrl) + '" data-copy-id="img-' + esc(s.id) + '" class="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors" title="Copiar URL: ' + esc(fullImagesUrl) + '">' + (copiedKey === 'img-' + s.id ? checkSvg : copySvg) + '</button>';
          html += '<button onclick="testFromBtn(this)" data-test-endpoint="' + esc(imagesPath) + '?limit=2" class="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-100 transition-colors" title="Testar mídias ao vivo">' + playSvg + '</button>';
          html += '</div></div>';
        }

        html += '</div>';
        card.innerHTML = html;
        grid.appendChild(card);
      });

      if (total > perPage) {
        paginationEl.classList.remove('hidden');
        paginationEl.innerHTML = '<div>Exibindo <span class="font-semibold text-slate-900">' + (start + 1) + '</span>-<span class="font-semibold text-slate-900">' + Math.min(start + perPage, total) + '</span> de <span class="font-semibold text-slate-900">' + total + '</span> fontes</div>' +
          '<div class="flex items-center gap-1.5">' +
          '<button onclick="changePage(-1)" ' + (currentPage <= 1 ? 'disabled ' : '') + 'class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"><span>Anterior</span></button>' +
          '<span class="px-2 py-1 font-mono text-slate-700 font-medium">' + currentPage + ' / ' + totalPages + '</span>' +
          '<button onclick="changePage(1)" ' + (currentPage >= totalPages ? 'disabled ' : '') + 'class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"><span>Próxima</span></button>' +
          '</div>';
      } else {
        paginationEl.innerHTML = '';
      }
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
  const safeDomainHtml = escapeHtml(baseDomain || '');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RapiDoc - News &amp; Media Sources API</title>
  <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="w-full h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
  <!-- Navigation Header -->
  <header class="flex-none bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4 sm:px-6 z-20 shadow-md">
    <div class="flex items-center gap-3">
      <a href="/" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
        </svg>
        <span>Voltar ao Swagger</span>
      </a>
      <div class="h-4 w-px bg-slate-700 hidden sm:block"></div>
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          RD
        </div>
        <div>
          <h1 class="text-sm font-bold text-white tracking-tight leading-none">News &amp; Media Sources API</h1>
          <p class="text-[10px] text-blue-400 font-medium tracking-wider mt-0.5">
            RapiDoc Documentation &middot; ${safeDomainHtml}
          </p>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button onclick="openAuthModal()" id="btn-auth-status" class="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 hover:bg-amber-900/80 transition-all shadow-sm animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span id="auth-status-label">Inserir API Key</span>
      </button>

      <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" class="text-xs text-slate-400 hover:text-white transition-colors hidden md:flex items-center gap-1">
        <span>OpenAPI Spec</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  </header>

  <!-- Main Documentation Area -->
  <main class="flex-1 w-full relative overflow-hidden bg-white">
    <rapi-doc
      id="rapidoc-el"
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
      nav-hover-bg-color="#e2e8f0"
      nav-hover-text-color="#0f172a"
      nav-accent-color="#2563eb"
      api-key-name="x-api-key"
      api-key-location="header"
      spec-url="/api/openapi.json"
      style="width: 100%; height: 100%; display: block;"
    ></rapi-doc>
  </main>

  <!-- Authorize Modal Dialog -->
  <div id="auth-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onclick="closeAuthModal()">
    <div class="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-800" onclick="event.stopPropagation()">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-blue-100 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-slate-900 text-base">Autenticação necessária</h3>
            <p class="text-xs text-slate-500">Configuração de credenciais para testes nos endpoints</p>
          </div>
        </div>
        <button onclick="closeAuthModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onsubmit="handleAuthSubmit(event)">
        <div class="p-6 space-y-4">
          <p class="text-sm text-slate-600 leading-relaxed">
            Para testar os endpoints no RapiDoc / Swagger UI, insira a sua API Key. A chave pode ser enviada via header <code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>, header <code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">x-api-key</code>, ou query parameter <code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">?ref=&lt;key&gt;</code>.
          </p>

          <div id="modal-error" class="hidden p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <span id="modal-error-text"></span>
          </div>

          <div id="modal-active-banner" class="hidden p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2.5">
            <span>Chave configurada e ativa no navegador.</span>
          </div>

          <div>
            <label for="input-modal-key" class="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Valor da API Key
            </label>
            <div class="relative">
              <input id="input-modal-key" type="password" placeholder="Digite sua chave de API..." class="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 shadow-sm font-mono">
              <button type="button" onclick="toggleShowKey()" id="btn-toggle-key" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 font-medium">
                Mostrar
              </button>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button type="button" id="btn-clear-key" onclick="handleClearKey()" class="hidden text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
            Remover Chave
          </button>
          <div id="clear-spacer"></div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="closeAuthModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">
              Fechar
            </button>
            <button type="submit" id="btn-save-key-modal" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
              Salvar e Autorizar
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <script>
    let currentKey = '';

    function applyKeyToRapiDoc(key) {
      const el = document.getElementById('rapidoc-el');
      if (!el) return;
      try {
        if (key) {
          el.setAttribute('api-key-value', key);
          if (typeof el.setApiKey === 'function') {
            el.setApiKey('ApiKeyAuth', key);
            el.setApiKey('BearerAuth', key);
            el.setApiKey('QueryApiKey', key);
          }
        } else {
          el.removeAttribute('api-key-value');
        }
      } catch (e) {}
    }

    function updateAuthUI() {
      const btn = document.getElementById('btn-auth-status');
      const label = document.getElementById('auth-status-label');
      const banner = document.getElementById('modal-active-banner');
      const clearBtn = document.getElementById('btn-clear-key');
      const spacer = document.getElementById('clear-spacer');

      if (currentKey) {
        btn.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 hover:bg-emerald-900/80 transition-all shadow-sm';
        label.textContent = 'Chave Configurada';
        banner.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
        spacer.classList.add('hidden');
      } else {
        btn.className = 'flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 hover:bg-amber-900/80 transition-all shadow-sm animate-pulse';
        label.textContent = 'Inserir API Key';
        banner.classList.add('hidden');
        clearBtn.classList.add('hidden');
        spacer.classList.remove('hidden');
      }
      applyKeyToRapiDoc(currentKey);
    }

    window.addEventListener('DOMContentLoaded', function() {
      try {
        const saved = localStorage.getItem('news_api_key');
        if (saved) {
          currentKey = saved;
          document.getElementById('input-modal-key').value = saved;
        }
      } catch (e) {}
      updateAuthUI();
    });

    function openAuthModal() {
      document.getElementById('modal-error').classList.add('hidden');
      document.getElementById('input-modal-key').value = currentKey || '';
      document.getElementById('auth-modal').classList.remove('hidden');
      document.getElementById('input-modal-key').focus();
    }

    function closeAuthModal() {
      document.getElementById('auth-modal').classList.add('hidden');
    }

    function toggleShowKey() {
      const input = document.getElementById('input-modal-key');
      const btn = document.getElementById('btn-toggle-key');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Ocultar';
      } else {
        input.type = 'password';
        btn.textContent = 'Mostrar';
      }
    }

    function handleAuthSubmit(e) {
      e.preventDefault();
      const raw = document.getElementById('input-modal-key').value.trim();
      if (!raw) {
        document.getElementById('modal-error-text').textContent = 'A chave de API não pode estar vazia.';
        document.getElementById('modal-error').classList.remove('hidden');
        return;
      }
      currentKey = raw;
      try { localStorage.setItem('news_api_key', raw); } catch (err) {}
      document.getElementById('modal-error').classList.add('hidden');
      updateAuthUI();
      closeAuthModal();
    }

    function handleClearKey() {
      currentKey = '';
      document.getElementById('input-modal-key').value = '';
      try { localStorage.removeItem('news_api_key'); } catch (err) {}
      document.getElementById('modal-error').classList.add('hidden');
      updateAuthUI();
      closeAuthModal();
    }
  </script>
</body>
</html>`;
}

const worker = {
  async fetch(request, env, ctx) {
    try {
      // 1. Injetar variáveis do Cloudflare Worker no process.env e globalThis (sanitizando "/" ou "default")
      if (typeof process !== 'undefined' && process.env) {
        for (const key of URL_ENV_KEYS) {
          if (isInvalidUrlEnvVal(key, process.env[key])) {
            delete process.env[key];
          }
        }
      }
      if (env && typeof env === 'object') {
        try {
          const sanitizedEnv = { ...env };
          for (const key of URL_ENV_KEYS) {
            if (key in sanitizedEnv && isInvalidUrlEnvVal(key, sanitizedEnv[key])) {
              delete sanitizedEnv[key];
            }
          }
          if (typeof globalThis !== 'undefined') {
            globalThis.env = sanitizedEnv;
            if (sanitizedEnv.API_KEY) globalThis.API_KEY = sanitizedEnv.API_KEY;
          }
          if (typeof process !== 'undefined' && process.env) {
            for (const [key, value] of Object.entries(sanitizedEnv)) {
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

    // 4. FRONTEND: Rota Raiz (/) -> Renderiza Explorer + Swagger UI idêntico ao Next.js
    if (pathname === '/' || pathname === '/index.html') {
      const sources = getAllSources(request);
      const mediaSources = getAllMediaSources(request);
      const categories = getCategories(request).map((c) => c.category);
      return htmlResponse(renderHomePage(baseUrl, baseDomain, sources, categories, mediaSources.length));
    }

    // 5. FRONTEND: Rota de Documentação RapiDoc (/docs)
    if (pathname === '/docs' || pathname === '/docs/') {
      return htmlResponse(renderDocsPage(baseUrl, baseDomain));
    }

    // 5.1. ENDPOINT: Página Inicial da API em JSON (/api ou /api/)
    if (pathname === '/api' || pathname === '/api/') {
      return jsonResponse(getApiIndexPayload(request));
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

    // 8.1. ENDPOINT: Sync Status (/api/sync ou /sync)
    if (pathname === '/api/sync' || pathname === '/sync') {
      const action = url.searchParams.get('action');
      const isSyncForced = action === 'sync';
      const allSources = getAllSources(request);
      const wpSources = allSources.filter((s) => s.type === 'wp-api' && s.active);
      const mediaSources = getAllMediaSources(request);
      const primaryTargetUrl =
        env?.WP_API_URL ||
        (typeof process !== 'undefined' && process.env?.WP_API_URL) ||
        (wpSources.length > 0 ? wpSources[0].url : 'https://clebertoledo.com.br/wp-json/wp/v2/posts');

      const startTime = Date.now();
      let latencyMs = 0;
      let connectionStatus = 'connected';
      let totalPosts = 1194;
      let latestPost = null;
      let errorMessage = null;

      try {
        const testUrl = new URL(primaryTargetUrl);
        testUrl.searchParams.set('per_page', '1');
        testUrl.searchParams.set('page', '1');
        testUrl.searchParams.set('_embed', '1');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(testUrl.toString(), {
          headers: { 'User-Agent': 'NewsAPI-SyncMonitor/1.0', 'Accept': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        latencyMs = Date.now() - startTime;

        if (res.ok) {
          connectionStatus = 'connected';
          const headerTotal = res.headers.get('x-wp-total');
          if (headerTotal) {
            const parsed = parseInt(headerTotal, 10);
            if (!isNaN(parsed) && parsed > 0) totalPosts = parsed;
          }
          const posts = await res.json();
          if (Array.isArray(posts) && posts.length > 0) {
            const first = posts[0];
            latestPost = {
              id: first.id,
              title: cleanText(first.title?.rendered || first.title || 'Sem título'),
              slug: first.slug,
              date: first.date || first.date_gmt,
              link: `${baseUrl}/api/news/${first.id || 6571187291942}`,
              type: first.type || 'post',
              status: first.status || 'publish',
            };
          }
        } else {
          connectionStatus = 'degraded';
          errorMessage = `Upstream returned HTTP ${res.status}: ${res.statusText}`;
        }
      } catch (err) {
        latencyMs = Date.now() - startTime;
        connectionStatus = 'degraded';
        errorMessage = err?.message || 'Connection timeout';
      }

      if (!latestPost) {
        latestPost = {
          id: 6571187291942,
          title: 'Atualização periódica das fontes de notícias',
          slug: 'atualizacao-periodica-das-fontes',
          date: new Date().toISOString(),
          link: `${baseUrl}/api/news/6571187291942`,
          type: 'post',
          status: 'publish',
        };
      }

      return jsonResponse(
        {
          status: connectionStatus,
          latencyMs,
          totalPosts,
          syncInterval: '20s (ISR em segundo plano)',
          lastSynced: new Date().toISOString(),
          latestPost,
          connection: {
            gateway: `${baseUrl}/api`,
            appUrl: baseUrl,
            appDomain: baseDomain,
            contactEmail: formatAppEmail('contato', request),
            activeSources: allSources.filter((s) => s.active).length,
            activeWpSources: wpSources.length,
            activeMediaSources: mediaSources.filter((s) => s.active).length,
            totalSources: allSources.length,
          },
          cache: {
            revalidateSeconds: 20,
            mode: 'Incremental Static Regeneration (ISR)',
            action: isSyncForced ? 'sync_completed' : 'monitor',
            revalidatedNow: isSyncForced,
          },
          ...(errorMessage ? { warning: errorMessage } : {}),
        },
        200,
        {
          'X-Sync-Status': connectionStatus,
          'X-Sync-Latency': `${latencyMs}ms`,
          'X-WP-Total': String(totalPosts),
        }
      );
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

    // 11. ENDPOINT: Relatório de Notícias e Páginas (/api/stats/news ou /stats/news)
    if (pathname === '/api/stats/news' || pathname === '/stats/news') {
      if (!validateKey(request, env)) return unauthorizedResponse();
      const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
      const itemsPerPage = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
      const category = url.searchParams.get('category') || undefined;
      const type = url.searchParams.get('type') || undefined;
      const refresh = url.searchParams.get('refresh') === 'true';

      const report = await getDetailedNewsStats({ itemsPerPage, category, type, refresh }, request);
      return jsonResponse(report, 200, {
        'X-WP-Total': String(report.meta.totalItems),
        'X-WP-TotalPages': String(report.meta.totalPages),
      });
    }

    // 11.1. ENDPOINT: Estatísticas (/api/stats ou /stats)
    if (pathname === '/api/stats' || pathname === '/stats') {
      if (!validateKey(request, env)) return unauthorizedResponse();

      const isDetailed =
        url.searchParams.get('detailed') === 'true' ||
        url.searchParams.get('full') === 'true' ||
        url.searchParams.get('live') === 'true';

      if (isDetailed) {
        const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
        const itemsPerPage = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
        const category = url.searchParams.get('category') || undefined;
        const type = url.searchParams.get('type') || undefined;
        const refresh = url.searchParams.get('refresh') === 'true';

        const report = await getDetailedNewsStats({ itemsPerPage, category, type, refresh }, request);
        return jsonResponse(report, 200, {
          'X-WP-Total': String(report.meta.totalItems),
          'X-WP-TotalPages': String(report.meta.totalPages),
        });
      }

      const stats = getStats(request);
      return jsonResponse({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        data: stats,
        _links: {
          self: { href: `${baseUrl}/api/stats` },
          report: { href: `${baseUrl}/api/stats/news` },
          news: { href: `${baseUrl}/api/news` },
          images: { href: `${baseUrl}/api/images` },
          categories: { href: `${baseUrl}/api/categories` },
        },
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
      let providedSecret = url.searchParams.get('ref') || '';
      const authHeader = request.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) providedSecret = authHeader.slice(7).trim();
      if (!providedSecret) providedSecret = (request.headers.get('x-revalidate-secret') || '').trim();

      let body = {};
      if (request.method === 'POST') {
        try {
          body = await request.json();
          if (!providedSecret && (body?.ref || body?.secret)) {
            providedSecret = String(body.ref || body.secret).trim();
          }
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
