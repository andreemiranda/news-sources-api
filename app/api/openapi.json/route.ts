export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getTypes } from '@/lib/sources';

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const categories = getCategories().map((c) => c.category);
  const types = getTypes().map((t) => t.type);

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'News Sources API',
      description:
        'REST API for accessing news sources data and live articles/media aggregated from various Brazilian news outlets.',
      version: '1.0.0',
    },
    servers: [{ url: getBaseUrl(req), description: 'API Server' }],
    components: {
      securitySchemes: {},
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
            title: { type: 'string', example: 'Avanço nos investimentos e novas iniciativas no estado' },
            link: { type: 'string', example: 'https://exemplo.com.br/noticia-exemplo' },
            description: { type: 'string', example: 'Resumo da matéria jornalística...' },
            content: { type: 'string', example: '<p>Conteúdo integral...</p>' },
            pubDate: { type: 'string', format: 'date-time', example: '2026-08-21T09:30:00' },
            author: { type: 'string', example: 'Redação' },
            imageUrl: { type: 'string', example: 'https://exemplo.com.br/wp-content/uploads/imagem.jpg' },
            mediaUrl: { type: 'string', example: 'https://exemplo.com.br/wp-content/uploads/arquivo.pdf' },
            raw: { type: 'object', description: 'Raw upstream payload (if raw=true is passed)' },
          },
        },
      },
    },
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
                    type: 'array',
                    items: { $ref: '#/components/schemas/Source' }
                  },
                },
              },
            }
          },
        },
      },
      '/news/{id}': {
        get: {
          tags: ['News Content'],
          summary: 'Get live news content',
          description:
            'Fetches the real news content directly from the selected source ID.',
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
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ContentItem' }
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
                    type: 'array',
                    items: { $ref: '#/components/schemas/Source' }
                  },
                },
              },
            }
          },
        },
      },
      '/images/{id}': {
        get: {
          tags: ['Images Content'],
          summary: 'Get live media items from source',
          description:
            'Fetches the real media uploads and attachment items directly from the selected WordPress media source ID.',
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
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ContentItem' }
                  },
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

  return NextResponse.json(spec);
}
