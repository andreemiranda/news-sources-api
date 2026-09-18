export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getTypes, getAllSources, getAllMediaSources, getBaseUrl, getBaseDomain } from '@/lib/sources';

export async function GET(req: NextRequest) {
  const categories = getCategories().map((c) => c.category);
  const types = getTypes().map((t) => t.type);
  const baseUrl = getBaseUrl(req);
  const baseDomain = getBaseDomain(req);

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'News & Media Sources API',
      description:
        'REST API for accessing news sources data and live articles/media aggregated from Brazilian news outlets. Endpoints require API Key authentication via header Authorization: Bearer <key>, header x-api-key, or query parameter ?api_key=<key>.',
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
          description: 'API key in header (x-api-key: <key>)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Bearer token in Authorization header (Authorization: Bearer <key>)',
        },
        QueryApiKey: {
          type: 'apiKey',
          in: 'query',
          name: 'api_key',
          description: 'API key in query string (?api_key=<key>)',
        },
      },
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
      schemas: {
        Source: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 383841537673882 },
            category: { type: 'string', example: 'Tocantins' },
            site: { type: 'string', example: 'clebertoledo.com.br' },
            type: { type: 'string', example: 'wp-api', enum: types },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://clebertoledo.com.br/wp-json/wp/v2/posts',
            },
            mediaUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://clebertoledo.com.br/wp-json/wp/v2/media',
            },
            active: { type: 'boolean', example: true },
          },
        },
        Meta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 72 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 1 },
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
            id: { type: 'integer', example: 319687 },
            title: { type: 'string', example: 'Título da notícia ou mídia' },
            link: { type: 'string', example: `${baseUrl}/noticia-exemplo` },
            description: { type: 'string', example: 'Resumo da matéria jornalística...' },
            content: { type: 'string', example: '<p>Conteúdo integral...</p>' },
            pubDate: { type: 'string', format: 'date-time', example: '2026-09-16T19:12:25Z' },
            author: { type: 'string', example: 'Redação' },
            imageUrl: { type: 'string', example: `${baseUrl}/uploads/imagem.jpg` },
            mediaUrl: { type: 'string', example: `${baseUrl}/uploads/arquivo.jpg` },
            raw: { type: 'object', description: 'Raw upstream payload (if raw=true is passed)' },
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
              description: 'Search keyword to filter articles',
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
            '401': {
              description: 'Unauthorized. Invalid or missing API key.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '404': {
              description: 'Source ID not found.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '502': {
              description: 'Upstream gateway error.',
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
            '401': {
              description: 'Unauthorized.',
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
            '401': {
              description: 'Unauthorized.',
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
      '/categories': {
        get: {
          tags: ['Metadata'],
          summary: 'List all news categories',
          description: 'Returns all available news categories with their source counts.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': {
              description: 'List of categories',
              content: {
                'application/json': {
                  schema: {
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
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/types': {
        get: {
          tags: ['Metadata'],
          summary: 'List all source types',
          description: 'Returns available source types (wp-api, rss) with their counts.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': {
              description: 'List of types',
              content: {
                'application/json': {
                  schema: {
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
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/stats': {
        get: {
          tags: ['Metadata'],
          summary: 'Get global API statistics',
          description: 'Returns summary counts of sources, categories, and types.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': {
              description: 'Statistics object',
            },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check endpoint',
          description: 'Public health check to monitor uptime and service readiness. Does not require authentication.',
          security: [],
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', example: '2026-09-17T10:00:00.000Z' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  // Automatically generate individual endpoint definitions for every active source in sources.json
  const allSources = getAllSources();
  allSources.forEach((source) => {
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
            '200': {
              description: 'Successful response',
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
          },
        },
      };

      // Also create matching image/media endpoint with the SAME ID if it has media capability
      if (source.mediaUrl || source.type === 'wp-api') {
        (spec.paths as any)[`/images/${source.id}`] = {
          get: {
            tags: ['Images & Media Sources'],
            summary: `Get media uploads from ${source.site}`,
            description: `Fetches media uploads directly from ${source.site}. Unified ID: ${source.id}`,
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
              '200': {
                description: 'Successful response',
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
            },
          },
        };
      }
    }
  });

  return NextResponse.json(spec);
}
