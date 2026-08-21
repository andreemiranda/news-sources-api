const fs = require('fs');

const cleanPaths = `    paths: {
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
      }
    }
  };`;

function fixSpec(file) {
  let content = fs.readFileSync(file, 'utf8');
  let parts = content.split('    paths: {');
  let before = parts[0];
  let newContent = before + cleanPaths;
  if (file === 'app/page.tsx') {
    newContent += `\n\n  return (`;
    // grab the rest of the file
    let endParts = content.split('  return (');
    if (endParts.length > 1) {
      newContent += endParts[1];
    }
  } else {
    newContent += `\n\n  return NextResponse.json(spec);\n}`;
  }
  fs.writeFileSync(file, newContent);
}

fixSpec('app/page.tsx');
fixSpec('app/api/openapi.json/route.ts');
