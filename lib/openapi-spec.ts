import {
  getCategories,
  getTypes,
  getAllSources,
  getAllMediaSources,
  getBaseUrl,
  getBaseDomain,
  formatAppEmail,
  formatAppUrl,
} from './sources';

export function getOpenApiSpec(req?: Request) {
  const categories = getCategories().map((c) => c.category);
  const types = getTypes().map((t) => t.type);
  const baseUrl = getBaseUrl(req);
  const baseDomain = getBaseDomain(req);

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'News & Media Sources API',
      description:
        'REST API for accessing news sources data and live articles/media aggregated from Brazilian news outlets. Endpoints require authentication via header Authorization: Bearer <key>, header x-api-key, or query parameter ?ref=<key>.',
      version: '1.0.0',
      contact: {
        name: 'Suporte API',
        url: formatAppUrl('/docs', req),
        email: formatAppEmail('contato', req),
      },
    },
    servers: [
      { url: '/api', description: 'API Gateway (Ambiente Atual / Relativo)' },
      ...(baseUrl ? [{ url: `${baseUrl}/api`, description: `Gateway de Produção (${baseDomain})` }] : []),
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
          name: 'ref',
          description: 'Access credential via URL query parameter (?ref=<valor>)',
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
        ContentItem: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '12345' },
            title: { type: 'string', example: 'Título da Notícia' },
            description: { type: 'string', example: 'Resumo da matéria jornalística' },
            content: { type: 'string', example: 'Conteúdo completo da notícia limpo e sem anúncios' },
            link: { type: 'string', example: 'https://exemplo.com/noticia-1' },
            pubDate: { type: 'string', example: '2026-11-12T01:00:00Z' },
            image: { type: 'string', example: 'https://exemplo.com/imagem.jpg' },
            category: { type: 'string', example: 'Geral' },
            source: { type: 'string', example: 'Portal de Notícias' },
            sourceId: { type: 'integer', example: 6571187291942 },
          },
        },
      },
    },
    paths: {
      '/': {
        get: {
          summary: 'Página inicial da API em JSON (/api)',
          description: 'Retorna o índice geral da API em JSON com metadados, visão geral e links HATEOAS de todos os endpoints.',
          responses: {
            '200': {
              description: 'Índice JSON da API',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Health Check e Status da API',
          description: 'Endpoint público para monitoramento de disponibilidade e uptime.',
          responses: {
            '200': {
              description: 'Serviço operacional',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      uptime: { type: 'number', example: 123.45 },
                      timestamp: { type: 'string', example: '2026-11-12T02:00:00.000Z' },
                      platform: { type: 'string', example: 'cloudflare-worker' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/categories': {
        get: {
          summary: 'Listar todas as categorias disponíveis',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': {
              description: 'Lista de categorias',
              content: { 'application/json': { schema: { type: 'array' } } },
            },
            '401': { description: 'Não autorizado' },
          },
        },
      },
      '/types': {
        get: {
          summary: 'Listar os protocolos suportados (wp-api, rss)',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': {
              description: 'Lista de tipos',
              content: { 'application/json': { schema: { type: 'array' } } },
            },
            '401': { description: 'Não autorizado' },
          },
        },
      },
      '/stats': {
        get: {
          summary: 'Estatísticas consolidadas da API',
          parameters: [
            { name: 'detailed', in: 'query', schema: { type: 'boolean', default: false }, description: 'Quando true, retorna o relatório completo de notícias e páginas de todas as fontes e categorias' },
          ],
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': {
              description: 'Estatísticas da API',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Não autorizado' },
          },
        },
      },
      '/stats/news': {
        get: {
          summary: 'Relatório detalhado de notícias e páginas por fonte e categoria',
          description: 'Consulta em tempo real o total de notícias e total de páginas disponíveis em cada fonte e categoria, consolidando o volume global da API com blocos meta e page.',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1, maximum: 30 } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['wp-api', 'rss'] } },
            { name: 'refresh', in: 'query', schema: { type: 'boolean', default: false } },
          ],
          responses: {
            '200': {
              description: 'Relatório completo de notícias e páginas por fonte e categoria',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Não autorizado' },
          },
        },
      },
      '/news': {
        get: {
          summary: 'Listar fontes de notícias cadastradas',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string' } },
            { name: 'active', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: {
            '200': {
              description: 'Lista de fontes com metadados HATEOAS',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Não autorizado' },
          },
        },
      },
      '/news/{id}': {
        get: {
          summary: 'Obter notícias em tempo real de uma fonte específica',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Matérias jornalísticas da fonte',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Não autorizado' },
            '404': { description: 'Fonte não encontrada' },
          },
        },
      },
      '/images': {
        get: {
          summary: 'Listar fontes com suporte a mídia e uploads de imagem',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          ],
          responses: {
            '200': {
              description: 'Lista de fontes com suporte a mídias',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Não autorizado' },
          },
        },
      },
      '/images/{id}': {
        get: {
          summary: 'Obter imagens e uploads em tempo real de uma fonte',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            '200': {
              description: 'Mídias e fotos da fonte',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            '401': { description: 'Não autorizado' },
            '404': { description: 'Fonte não encontrada' },
          },
        },
      },
    },
  };

  // Preencher caminhos de exemplo para cada fonte
  const allSources = getAllSources(req);
  allSources.slice(0, 15).forEach((source) => {
    const pathKey = `/news/${source.id}`;
    if (!(spec.paths as any)[pathKey]) {
      (spec.paths as any)[pathKey] = {
        get: {
          summary: `${source.category} - Notícias ao vivo (ID: ${source.id})`,
          tags: [source.category],
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { QueryApiKey: [] }],
          responses: {
            '200': { description: 'Sucesso' },
            '401': { description: 'Não autorizado' },
          },
        },
      };
    }
  });

  return spec;
}
