import { getAllSources, getCategories, getTypes } from '@/lib/sources';
import { getAllMediaSources } from '@/lib/media';
import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Home() {
  const sources = getAllSources();
  const mediaSources = getAllMediaSources();
  const categories = getCategories().map((c) => c.category);
  const types = getTypes().map((t) => t.type);

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'News Sources API',
      description:
        'REST API for accessing news sources data and live articles/media aggregated from various Brazilian news outlets. All endpoints require API key authentication.',
      version: '1.0.0',
    },
    servers: [{ url: '/', description: 'API Server' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Bearer token authentication with API key',
        },
      },
      schemas: {
        Source: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '1' },
            category: { type: 'string', example: 'Tocantins' },
            site: { type: 'string', example: 'exemplo.com.br' },
            type: { type: 'string', example: 'wp-api', enum: types },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://exemplo.com.br/wp-json/wp/v2/posts',
            },
            active: { type: 'boolean', example: true },
          },
        },
        Meta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        ContentItem: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '101' },
            title: { type: 'string', example: 'Título da Notícia ou Mídia' },
            link: { type: 'string', example: 'https://exemplo.com.br/noticia-exemplo' },
            description: { type: 'string', example: 'Resumo da publicação jornalística.' },
            content: { type: 'string', example: '<p>Conteúdo completo da notícia...</p>' },
            pubDate: { type: 'string', example: '2026-08-21T10:00:00Z' },
            author: { type: 'string', example: 'Redação' },
            categories: {
              type: 'array',
              items: { type: 'string' },
              example: ['Geral', 'Economia'],
            },
            imageUrl: { type: 'string', example: 'https://exemplo.com.br/wp-content/uploads/imagem.jpg' },
            mediaUrl: { type: 'string', example: 'https://exemplo.com.br/wp-content/uploads/arquivo.pdf' },
          },
        },
        ContentResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                source: { $ref: '#/components/schemas/Source' },
                pagination: { $ref: '#/components/schemas/Meta' },
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ContentItem' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      '/sources': {
        get: {
          tags: ['Sources'],
          summary: 'List all sources',
          description:
            'Returns a paginated list of all news sources. Supports filtering by category, type, and active status.',
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
            {
              name: 'stats',
              in: 'query',
              description: 'Return only statistics summary (stats=true)',
              schema: { type: 'boolean' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Source' },
                      },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/sources/{id}': {
        get: {
          tags: ['Sources'],
          summary: 'Get source by ID',
          description: 'Returns a single news source by its unique ID.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Source ID',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Source' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Source not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/sources/{id}/content': {
        get: {
          tags: ['Content'],
          summary: 'Get live news content from source (72 sources available)',
          description:
            'Fetches the real news content directly from the selected source ID (1 to 72). Automatically handles both WordPress REST APIs and RSS Feeds, parsing posts, authors, dates, excerpts, and images.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Source ID (1 to 72)',
              required: true,
              schema: { type: 'string', example: '1' },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number (default: 1)',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 10, max: 100)',
              required: false,
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search keyword to filter news articles',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'raw',
              in: 'query',
              description: 'Return raw upstream JSON payload alongside parsed items',
              required: false,
              schema: { type: 'boolean', default: false },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response with live news articles',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ContentResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Source not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '502': {
              description: 'Bad Gateway / Upstream Source Error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/sources/category/{category}': {
        get: {
          tags: ['Sources'],
          summary: 'Get sources by category',
          description:
            'Returns all news sources belonging to a specific category (case-insensitive).',
          parameters: [
            {
              name: 'category',
              in: 'path',
              description: 'Category name',
              required: true,
              schema: { type: 'string', enum: categories },
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
              description: 'Items per page (default: 100, max: 1000)',
              schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      category: { type: 'string' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Source' },
                      },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Category not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List all categories',
          description:
            'Returns a list of all news source categories with the count of sources in each.',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            category: { type: 'string' },
                            count: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/types': {
        get: {
          tags: ['Types'],
          summary: 'List all source types',
          description:
            'Returns a list of all news source types (wp-api, rss) with the count of sources in each.',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            count: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/stats': {
        get: {
          tags: ['Stats'],
          summary: 'Get API statistics',
          description:
            'Returns aggregate statistics about the news sources database.',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          totalSources: { type: 'integer' },
                          totalCategories: { type: 'integer' },
                          totalTypes: { type: 'integer' },
                          activeSources: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/media': {
        get: {
          tags: ['Media'],
          summary: 'List all media sources',
          description: 'Returns a list of all media sources.',
          parameters: [
            {
              name: 'active',
              in: 'query',
              description: 'Filter by active status (true/false)',
              required: false,
              schema: { type: 'boolean' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Source' },
                      },
                      meta: { $ref: '#/components/schemas/Meta' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/media/{id}': {
        get: {
          tags: ['Media'],
          summary: 'Get media source by ID',
          description: 'Returns a single media source by its unique ID.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Media Source ID',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Source' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Source not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/media/{id}/content': {
        get: {
          tags: ['Content', 'Media'],
          summary: 'Get live media items from source (27 media endpoints available)',
          description:
            'Fetches the real media uploads and attachment items directly from the selected WordPress media source ID (28 to 54). Supports pagination, search, and raw upstream payload.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Media Source ID (28 to 54)',
              required: true,
              schema: { type: 'string', example: '28' },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Page number (default: 1)',
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 10, max: 100)',
              required: false,
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            },
            {
              name: 'search',
              in: 'query',
              description: 'Search keyword to filter media uploads',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'raw',
              in: 'query',
              description: 'Return raw upstream JSON payload alongside parsed items',
              required: false,
              schema: { type: 'boolean', default: false },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response with live media uploads',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ContentResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Media source not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '502': {
              description: 'Bad Gateway / Upstream Source Error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
  };

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
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
                  News Sources API
                </h1>
                <p className="text-sm text-slate-400">
                  Documentação interativa &middot; v1.0.0
                </p>
              </div>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl">
              API REST para acesso a fontes de notícias brasileiras e conteúdos em tempo real. Todos os
              endpoints requerem autenticação por API Key. Use a documentação
              interativa abaixo para explorar e testar cada endpoint.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600">
                <span className="text-xs text-slate-400 block">Fontes (Conteúdo)</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {sources.length}
                </span>
              </div>
              <div className="bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600">
                <span className="text-xs text-slate-400 block">Mídias (Conteúdo)</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {mediaSources.length}
                </span>
              </div>
              <div className="bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600">
                <span className="text-xs text-slate-400 block">Categorias</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {categories.length}
                </span>
              </div>
              <div className="bg-slate-700/50 rounded-lg px-4 py-2 border border-slate-600">
                <span className="text-xs text-slate-400 block">Tipos</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {types.length}
                </span>
              </div>
              <div className="ml-auto flex items-center">
                <Link
                  href="/docs"
                  id="btn-nav-docs"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Documentação completa</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm">
              <p className="font-semibold text-amber-900 mb-1">
                Autenticação necessária
              </p>
              <p className="text-amber-800 mb-2">
                Para testar os endpoints no Swagger UI, clique no bot&atilde;o
                &quot;Authorize&quot; e insira a sua API Key.
              </p>
              <p className="text-amber-700 text-xs mt-2">
                A chave pode ser enviada via header
                <code className="mx-1 px-1 bg-amber-100 rounded">Authorization: Bearer &lt;key&gt;</code>,
                header
                <code className="mx-1 px-1 bg-amber-100 rounded">x-api-key</code>,
                ou query parameter
                <code className="mx-1 px-1 bg-amber-100 rounded">?api_key=&lt;key&gt;</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <SwaggerUIWrapper spec={spec} />
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} News Sources API. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
