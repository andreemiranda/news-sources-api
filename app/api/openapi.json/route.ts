import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { getAllSources, getCategories, getTypes } from '@/lib/sources';
import { getCloudflareContext } from '@opennextjs/cloudflare';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  try {
    const ctx = getCloudflareContext();
    const envBaseUrl = (ctx?.env as Record<string, string> | undefined)?.NEXT_PUBLIC_BASE_URL;
    if (envBaseUrl) {
      return envBaseUrl;
    }
  } catch {
    // Ignore
  }
  return 'https://news-sources-api.mirandinhacontabilidade.workers.dev';
}

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const sources = getAllSources();
  const categories = getCategories().map((c) => c.category);
  const types = getTypes().map((t) => t.type);

  const baseUrl = getBaseUrl();

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'News Sources API',
      description:
        'REST API for accessing news sources data aggregated from various Brazilian news outlets. All endpoints require API key authentication.',
      version: '1.0.0',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      { url: '/', description: 'Servidor Atual (Relativo)' },
      { url: baseUrl, description: 'Servidor de Produção' },
    ],
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
        Stats: {
          type: 'object',
          properties: {
            totalSources: { type: 'integer' },
            totalCategories: { type: 'integer' },
            totalTypes: { type: 'integer' },
            activeSources: { type: 'integer' },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
            types: {
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
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 100, max: 1000)',
              required: false,
              schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
            },
            {
              name: 'category',
              in: 'query',
              description: 'Filter by category (case-insensitive)',
              required: false,
              schema: { type: 'string', enum: categories },
            },
            {
              name: 'type',
              in: 'query',
              description: 'Filter by source type',
              required: false,
              schema: { type: 'string', enum: types },
            },
            {
              name: 'active',
              in: 'query',
              description: 'Filter by active status (true/false)',
              required: false,
              schema: { type: 'boolean' },
            },
            {
              name: 'stats',
              in: 'query',
              description: 'Return only statistics summary (stats=true)',
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
              required: false,
              schema: { type: 'integer', default: 1, minimum: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Items per page (default: 100, max: 1000)',
              required: false,
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
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
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
                      meta: {
                        type: 'object',
                        properties: { total: { type: 'integer' } },
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
            'Returns a list of all news source types with the count of sources in each.',
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
                      meta: {
                        type: 'object',
                        properties: { total: { type: 'integer' } },
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
            'Returns aggregate statistics about the news sources database, including total counts and breakdowns by category and type.',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Stats' },
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

  return NextResponse.json(spec);
}
