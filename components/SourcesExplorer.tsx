'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  Layers,
  FileCode,
  Radio,
  Image as ImageIcon,
  Newspaper,
  Terminal,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SourceItem {
  id: number | string;
  category: string;
  site?: string;
  type: string;
  url?: string;
  mediaUrl?: string;
  active: boolean;
  slug?: string;
}

interface SourcesExplorerProps {
  sources: SourceItem[];
  categories: string[];
  appUrl?: string;
  appDomain?: string;
}

export default function SourcesExplorer({
  sources,
  categories,
  appUrl = '',
  appDomain = '',
}: SourcesExplorerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [apiKey, setApiKey] = useState<string>('');
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    loading: boolean;
    data: any;
    status: number | null;
  } | null>(null);

  const ITEMS_PER_PAGE = 18;

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchesCategory = selectedCategory === 'all' || s.category.toLowerCase() === selectedCategory.toLowerCase();
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        String(s.id).includes(query) ||
        s.category.toLowerCase().includes(query) ||
        (s.site && s.site.toLowerCase().includes(query)) ||
        (s.type && s.type.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [sources, selectedCategory, search]);

  const totalPages = Math.ceil(filteredSources.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedSources = useMemo(() => {
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredSources.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSources, safePage]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedEndpoint(id);
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch {}
  };

  const executeQuickTest = async (endpoint: string) => {
    setTestResult({
      endpoint,
      loading: true,
      data: null,
      status: null,
    });

    try {
      const headers: Record<string, string> = {};
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        headers['x-api-key'] = apiKey.trim();
      }

      const res = await fetch(endpoint, {
        headers,
      });
      const json = await res.json().catch(() => null);
      setTestResult({
        endpoint,
        loading: false,
        data: json,
        status: res.status,
      });
    } catch (err: any) {
      setTestResult({
        endpoint,
        loading: false,
        data: { error: err?.message || 'Falha na requisição' },
        status: 500,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* System Endpoints Quick Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm tracking-wide uppercase text-slate-200">
              Rotas do Sistema & Monitoramento
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {appDomain && (
              <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 font-mono text-blue-300">
                Domínio: <strong className="text-white">{appDomain}</strong>
              </span>
            )}
            <div>
              Revalidação ISR: <span className="text-emerald-400 font-mono font-semibold">20 segundos</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Status da Conexão</span>
              <code className="text-xs text-blue-300 font-mono font-semibold">/api/sync</code>
            </div>
            <button
              onClick={() => executeQuickTest('/api/sync')}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
              title="Testar endpoint"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Sincronia de Versão</span>
              <code className="text-xs text-purple-300 font-mono font-semibold">/api/version</code>
            </div>
            <button
              onClick={() => executeQuickTest('/api/version')}
              className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors"
              title="Testar endpoint"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Health Check</span>
              <code className="text-xs text-emerald-300 font-mono font-semibold">/api/health</code>
            </div>
            <button
              onClick={() => executeQuickTest('/api/health')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white transition-colors"
              title="Testar endpoint"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Estatísticas Gerais</span>
              <code className="text-xs text-amber-300 font-mono font-semibold">/api/stats</code>
            </div>
            <button
              onClick={() => executeQuickTest('/api/stats')}
              className="p-1.5 bg-amber-600 hover:bg-amber-500 rounded text-white transition-colors"
              title="Testar endpoint"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Test Results Modal / Panel */}
      {testResult && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-300">{testResult.endpoint}</span>
              {testResult.status && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    testResult.status >= 200 && testResult.status < 300
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  HTTP {testResult.status}
                </span>
              )}
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>

          <div className="mt-3">
            {testResult.loading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Consultando endpoint ao vivo...</span>
              </div>
            ) : (
              <pre className="text-xs font-mono bg-slate-950 text-emerald-400 p-4 rounded-lg max-h-64 overflow-y-auto overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por ID, categoria, site ou protocolo..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key (para testes)"
            className="w-44 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-mono text-xs"
            title="Insira sua API Key para testar rotas protegidas no navegador"
          />

          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">Todas as Categorias ({sources.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedSources.map((source) => {
          const hasMedia = Boolean(source.mediaUrl || source.type === 'wp-api');
          const isLudopedio = String(source.id) === '9124882157745';

          return (
            <div
              key={String(source.id)}
              className={`bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                isLudopedio ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    {source.category}
                  </span>
                  <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    <span className="truncate">{source.site || appDomain || source.category}</span>
                    {isLudopedio && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                        Feed & Imagens Únicas
                      </span>
                    )}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-500 block">ID: {source.id}</span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">{source.type}</span>
                </div>
              </div>

              {/* Endpoint buttons */}
              {(() => {
                const newsPath = `/api/news/${source.id}`;
                const fullNewsUrl = appUrl ? `${appUrl}${newsPath}` : newsPath;
                const imagesPath = `/api/images/${source.id}`;
                const fullImagesUrl = appUrl ? `${appUrl}${imagesPath}` : imagesPath;

                return (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {/* News Endpoint */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 truncate mr-2" title={fullNewsUrl}>
                        <Newspaper className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <code className="font-mono text-slate-700 truncate">{newsPath}</code>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(fullNewsUrl, `news-${source.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                          title={`Copiar URL: ${fullNewsUrl}`}
                        >
                          {copiedEndpoint === `news-${source.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => executeQuickTest(`${newsPath}?limit=2`)}
                          className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100 transition-colors"
                          title="Testar consulta ao vivo"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Media Endpoint if supported */}
                    {hasMedia && (
                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1.5 truncate mr-2" title={fullImagesUrl}>
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <code className="font-mono text-slate-700 truncate">{imagesPath}</code>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyToClipboard(fullImagesUrl, `img-${source.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title={`Copiar URL: ${fullImagesUrl}`}
                          >
                            {copiedEndpoint === `img-${source.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => executeQuickTest(`${imagesPath}?limit=2`)}
                            className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-100 transition-colors"
                            title="Testar mídias ao vivo"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {filteredSources.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Exibindo{' '}
            <span className="font-semibold text-slate-900">
              {(safePage - 1) * ITEMS_PER_PAGE + 1}
            </span>
            -
            <span className="font-semibold text-slate-900">
              {Math.min(safePage * ITEMS_PER_PAGE, filteredSources.length)}
            </span>{' '}
            de <span className="font-semibold text-slate-900">{filteredSources.length}</span> fontes
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="px-2 py-1 font-mono text-slate-700 font-medium">
              {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              <span>Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {filteredSources.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500">
          <p className="text-sm">Nenhuma fonte encontrada com o filtro atual.</p>
        </div>
      )}
    </div>
  );
}
