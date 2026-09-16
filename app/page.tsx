import { getAllSources, getCategories, getTypes } from '@/lib/sources';
import { getAllMediaSources } from '@/lib/media';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';

export default async function Home() {
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
            id: { type: 'string', example: '582319047120384' },
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
      '/news': {
        get: {
          tags: ['News'],
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
      '/news/{id}': {
        get: {
          tags: ['News Content'],
          summary: 'Get live news content',
          description:
            'Fetches the real news content directly from the selected source ID. Automatically handles both WordPress REST APIs and RSS Feeds, parsing posts, authors, dates, excerpts, and images.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Source ID (15 digits)',
              required: true,
              schema: { type: 'string', example: '582319047120384' },
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
      '/images': {
        get: {
          tags: ['Images'],
          summary: 'List all media endpoints',
          description:
            'Returns a list of all media sources. Supports filtering by active status.',
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
      '/images/{id}': {
        get: {
          tags: ['Images Content'],
          summary: 'Get live media items from source',
          description:
            'Fetches the real media uploads and attachment items directly from the selected WordPress media source ID. Supports pagination, search, and raw upstream payload.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              description: 'Media Source ID (15 digits)',
              required: true,
              schema: { type: 'string', example: '582319047120384' },
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
      }
    }
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
              API REST para acesso a fontes de notícias brasileiras e conteúdos em tempo real. Todos os endpoints requerem autenticação por API Key. Use a documentação interativa abaixo para explorar e testar cada endpoint. Use a documentação
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
                  <span>Documentação da API</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-2">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Parâmetros de Acesso (Autenticação)
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Todos os endpoints (exceto o <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded">/api/health</code>) requerem autenticação enviando uma API Key (senha). Você pode enviar a chave de 3 formas diferentes:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm">
              <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">1</span>
              <div>
                <span className="font-semibold text-slate-700 block">Header de Autorização Padrão (Recomendado)</span>
                <code className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded mt-1 inline-block">Authorization: Bearer &lt;sua-chave&gt;</code>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">2</span>
              <div>
                <span className="font-semibold text-slate-700 block">Header Customizado</span>
                <code className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded mt-1 inline-block">x-api-key: &lt;sua-chave&gt;</code>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm">
              <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">3</span>
              <div>
                <span className="font-semibold text-slate-700 block">Query Parameter</span>
                <code className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded mt-1 inline-block">?api_key=&lt;sua-chave&gt;</code>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <SwaggerUIWrapper spec={spec} />
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
