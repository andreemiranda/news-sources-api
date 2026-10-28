export const dynamic = 'force-dynamic';

import { getAllSources, getAllMediaSources, getCategories, getTypes, getBaseUrl, getBaseDomain } from '@/lib/sources';
import Link from 'next/link';
import { BookOpen, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';

export default async function Home() {
  const sources = getAllSources();
  const mediaSources = getAllMediaSources();
  const categories = getCategories().map((c) => c.category);
  const types = getTypes().map((t) => t.type);
  const baseUrl = getBaseUrl();
  const baseDomain = getBaseDomain();

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'News & Media Sources API',
      description:
        'REST API for accessing news sources data and live articles/media aggregated from Brazilian news outlets. All endpoints require API key authentication.',
      version: '1.0.0',
    },
    servers: [
      { url: `${baseUrl}/api`, description: `Production Gateway (${baseDomain})` },
      { url: '/api', description: 'Current Environment / Relative Gateway' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key via custom header (x-api-key: <key>)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Bearer token via Authorization header (Authorization: Bearer <key>)',
        },
        QueryApiKey: {
          type: 'apiKey',
          in: 'query',
          name: 'api_key',
          description: 'API key via URL query parameter (?api_key=<key>)',
        },
      },
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
      schemas: {
        Source: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 6571187291942, description: 'ID numérico de 13 dígitos sem o número 0' },
            category: { type: 'string', example: 'Tocantins' },
            type: { type: 'string', example: 'wp-api', enum: types },
            active: { type: 'boolean', example: true },
            _links: {
              type: 'object',
              properties: {
                self: { type: 'object', properties: { href: { type: 'string' } } },
                news: { type: 'object', properties: { href: { type: 'string' } } },
                images: { type: 'object', properties: { href: { type: 'string' } } },
              },
            },
          },
        },
        Meta: {
          type: 'object',
          properties: {
            itemCount: { type: 'integer', example: 10 },
            totalItems: { type: 'integer', example: 76 },
            itemsPerPage: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 8 },
            currentPage: { type: 'integer', example: 1 },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message description' },
          },
        },
        ContentItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 489123, description: 'ID numérico de 6 dígitos sem 0' },
            title: { type: 'string', example: 'Título da matéria jornalística' },
            slug: { type: 'string', example: 'titulo-da-materia-jornalistica' },
            alt: { type: 'string', example: 'Título da matéria jornalística' },
            description: { type: 'string', example: 'Resumo da matéria jornalística limpo...' },
            content: { type: 'string', example: 'Parágrafos jornalísticos completos revisados e limpos por IA.' },
            pubDate: { type: 'string', format: 'date-time', example: '2026-09-16T19:12:25Z' },
            author: { type: 'string', example: 'Redação' },
            imageUrl: { type: 'string', example: 'https://site.com/uploads/imagem.jpg', description: 'URL direta única para incorporação' },
            _links: {
              type: 'object',
              properties: {
                self: { type: 'object', properties: { href: { type: 'string' } } },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/ContentItem' } },
            _embedded: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/ContentItem' } } } },
            meta: { $ref: '#/components/schemas/Meta' },
            links: {
              type: 'object',
              properties: {
                first: { type: 'string' },
                previous: { type: 'string' },
                next: { type: 'string' },
                last: { type: 'string' },
              },
            },
            _links: {
              type: 'object',
              properties: {
                self: { type: 'object', properties: { href: { type: 'string' } } },
                first: { type: 'object', properties: { href: { type: 'string' } } },
                prev: { type: 'object', properties: { href: { type: 'string', nullable: true } } },
                next: { type: 'object', properties: { href: { type: 'string', nullable: true } } },
                last: { type: 'object', properties: { href: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    paths: {
      '/news': {
        get: {
          tags: ['News Sources'],
          summary: 'List all news sources',
          description:
            'Returns a paginated list of all news sources. Supports filtering by category, type, and active status.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number (default: 1)',
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 100, max: 1000)',
              schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
            },
            {
              name: 'category',
              in: 'query',
              description: 'Filter by category (case-insensitive)',
              schema: { type: 'string', enum: categories },
            },
            {
              name: 'type',
              in: 'query',
              description: 'Filter by source type',
              schema: { type: 'string', enum: types },
            },
            {
              name: 'active',
              in: 'query',
              description: 'Filter by active status (true/false)',
              schema: { type: 'boolean' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Source' },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized. API Key is missing or invalid.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/news/{id}': {
        get: {
          tags: ['News Articles'],
          summary: 'Get live news articles by source ID',
          description:
            'Fetches live news content dynamically from the selected news source ID.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Source ID (13 dígitos numéricos sem 0)',
              required: true,
              schema: { type: 'integer', example: 6571187291942 },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number (default: 1)',
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 10, max: 100)',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search keyword to filter articles',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response with live news articles',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ContentItem' },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Source not found' },
            '502': { description: 'Upstream gateway error' },
          },
        },
      },
      '/images': {
        get: {
          tags: ['Images & Media'],
          summary: 'List all media sources',
          description:
            'Returns a list of all media sources. Uses the same IDs as the news endpoints.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            {
              name: 'active',
              in: 'query',
              description: 'Filter by active status (true/false)',
              schema: { type: 'boolean' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Source' },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/images/{id}': {
        get: {
          tags: ['Images & Media'],
          summary: 'Get live images/media by source ID',
          description:
            'Fetches media items and image attachments directly using the same source ID as the news endpoints.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Source ID (15 digits)',
              required: true,
              schema: { type: 'integer', example: 383841537673882 },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number (default: 1)',
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 10, max: 100)',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search keyword to filter media uploads',
              schema: { type: 'string' },
            },
            {
              name: 'raw',
              in: 'query',
              description: 'Return raw upstream JSON payload alongside parsed items',
              schema: { type: 'boolean', default: false },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response with live media uploads',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ContentItem' },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Source not found' },
            '502': { description: 'Bad Gateway' },
          },
        },
      },
      '/categories': {
        get: {
          tags: ['Metadata'],
          summary: 'List all categories',
          description: 'Returns all news categories with slug and source counts.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': { description: 'List of categories with slug' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/news/category/{categoria}': {
        get: {
          tags: ['News Sources'],
          summary: 'List news sources by category or slug',
          description: 'Returns news sources filtered by category name or slug.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            {
              name: 'categoria',
              in: 'path',
              required: true,
              description: 'Category name or slug (ex.: "tocantins", "noticias-gerais")',
              schema: { type: 'string', example: 'tocantins' },
            },
          ],
          responses: {
            '200': { description: 'List of sources in the category' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/types': {
        get: {
          tags: ['Metadata'],
          summary: 'List all source types',
          description: 'Returns available source types (wp-api, rss) with counts.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': { description: 'List of types' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/stats': {
        get: {
          tags: ['Metadata'],
          summary: 'Get global API statistics',
          description: 'Summary statistics of sources, categories, and types.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': { description: 'Statistics object' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check endpoint',
          description: 'Public health check to monitor uptime. Does not require authentication.',
          security: [],
          responses: {
            '200': { description: 'Service is healthy' },
          },
        },
      },
    },
  };

  // Add individual dynamic endpoints for active sources
  sources.forEach((source) => {
    if (source.active) {
      (spec.paths as any)[`/news/${source.id}`] = {
        get: {
          tags: [`Sources - ${source.category}`],
          summary: `Get live news from ${source.site}`,
          description: `Fetches real news articles dynamically from ${source.url} (${source.type}). ID: ${source.id}`,
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number (default: 1)',
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 10, max: 100)',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search keyword',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Successful response' },
            '401': { description: 'Unauthorized' },
          },
        },
      };

      if (source.mediaUrl || source.type === 'wp-api') {
        (spec.paths as any)[`/images/${source.id}`] = {
          get: {
            tags: ['Images & Media Sources'],
            summary: `Get media from ${source.site}`,
            description: `Fetches media uploads from ${source.site}. Unified ID: ${source.id}`,
            security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
            parameters: [
              {
                name: 'page',
                in: 'query',
                description: 'Page number (default: 1)',
                schema: { type: 'integer', default: 1, minimum: 1 },
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Items per page (default: 10, max: 100)',
                schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
              },
            ],
            responses: {
              '200': { description: 'Successful response' },
              '401': { description: 'Unauthorized' },
            },
          },
        };
      }
    }
  });

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  News & Media Sources API
                </h1>
                <p className="text-sm text-slate-400">
                  Documentação Interativa Swagger UI &middot; v1.0.0
                </p>
              </div>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              API REST de alta performance para consulta e extração unificada de fontes de notícias e imagens jornalísticas. Todos os endpoints exigem autenticação prévia.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
                <span className="text-xs text-slate-400 block">Fontes Ativas</span>
                <span className="text-lg font-semibold text-blue-400">
                  {sources.length}
                </span>
              </div>
              <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
                <span className="text-xs text-slate-400 block">Endpoints de Mídia</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {mediaSources.length}
                </span>
              </div>
              <div className="bg-slate-800/80 rounded-lg px-4 py-2 border border-slate-700">
                <span className="text-xs text-slate-400 block">Categorias</span>
                <span className="text-lg font-semibold text-purple-400">
                  {categories.length}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/docs"
                  id="btn-nav-docs"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Documentação RapiDoc (/docs)</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Warning Notice Box explicitly requested by user */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div id="notice-auth-required" className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-amber-950 mb-1.5 flex items-center gap-2">
                <span>Autenticação necessária</span>
              </h2>
              <p className="text-amber-900 text-sm leading-relaxed mb-4 font-medium">
                Para testar os endpoints no Swagger UI, clique no botão &quot;Authorize&quot; e insira a sua API Key. A chave pode ser enviada via header <code className="bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">Authorization: Bearer &lt;key&gt;</code>, header <code className="bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">x-api-key</code>, ou query parameter <code className="bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">?api_key=&lt;key&gt;</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
                <div className="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs">
                  <span className="font-semibold text-slate-800 block mb-1">Opção 1 (Recomendado)</span>
                  <code className="text-blue-700 bg-blue-50 px-2 py-1 rounded block font-mono">
                    Authorization: Bearer &lt;key&gt;
                  </code>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs">
                  <span className="font-semibold text-slate-800 block mb-1">Opção 2 (Header Customizado)</span>
                  <code className="text-blue-700 bg-blue-50 px-2 py-1 rounded block font-mono">
                    x-api-key: &lt;key&gt;
                  </code>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-amber-200 text-xs">
                  <span className="font-semibold text-slate-800 block mb-1">Opção 3 (Query String)</span>
                  <code className="text-blue-700 bg-blue-50 px-2 py-1 rounded block font-mono">
                    ?api_key=&lt;key&gt;
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
          <SwaggerUIWrapper spec={spec} />
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} News & Media Sources API. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
