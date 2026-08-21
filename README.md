# News Sources API

API REST para acesso a fontes de notícias, endpoints de mídia e conteúdos em tempo real (posts, artigos, imagens e uploads) de portais brasileiros. Todos os endpoints são protegidos por API Key.

## Documentação Interativa

- **Swagger UI**: Disponível na página inicial (`/`).
- **RapiDoc**: Disponível na rota de documentação (`/docs`).
- **Especificação OpenAPI 3.0.3**: `/api/openapi.json`.

## Autenticação

Todos os endpoints exigem envio da API Key em um dos seguintes formatos:

1. Header `Authorization: Bearer <sua-chave>`
2. Header `x-api-key: <sua-chave>`
3. Query parameter `?api_key=<sua-chave>`

> **Configuração em Produção:** No Cloudflare Workers ou servidor, cadastre o segredo ou variável de ambiente `API_KEY`.

---

## Sumário de Endpoints Globais

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/sources` | Lista paginada das 72 fontes de notícias (filtros: `category`, `type`, `active`, `stats`) |
| GET | `/api/sources/{id}` | Metadados da fonte de notícia por ID (`1` a `72`) |
| GET | `/api/sources/{id}/content` | **Conteúdo em tempo real** da fonte {id} (`1` a `72`) — posts, artigos, autores, imagens (WordPress e RSS) |
| GET | `/api/sources/category/{category}` | Lista de fontes filtradas por categoria |
| GET | `/api/media` | Lista completa dos 27 endpoints de mídia WordPress (`/wp-json/wp/v2/media`) |
| GET | `/api/media/{id}` | Metadados do endpoint de mídia por ID (`28` a `54`) |
| GET | `/api/media/{id}/content` | **Conteúdo de mídia em tempo real** do endpoint {id} (`28` a `54`) — imagens, fotos, anexos e PDFs |
| GET | `/api/categories` | Lista de categorias com contagem de fontes |
| GET | `/api/types` | Lista de tipos de integração (`wp-api`, `rss`) com contagem de fontes |
| GET | `/api/stats` | Estatísticas gerais da API |
| GET | `/api/openapi.json` | Especificação OpenAPI 3.0.3 (JSON) |

---

## Documentação Completa e Lista de Endpoints

Para a lista detalhada com os endpoints individuais nominais de cada uma das **72 fontes** e dos **27 endpoints de mídia**, consulte o arquivo [`API_DOCS.md`](./API_DOCS.md) ou acesse a documentação interativa em `/docs`.

---

## Como Usar os Endpoints de Conteúdo em Tempo Real

### 1. Consultar Notícias de uma Fonte Específica (`/api/sources/{id}/content`)

Retorna as matérias e publicações atualizadas diretamente do portal (WordPress REST API ou RSS Feed XML).

```bash
# Exemplo: Obter as últimas 5 notícias da fonte 1 (clebertoledo.com.br)
curl -H "x-api-key: <SUA_API_KEY>" "https://seu-dominio.workers.dev/api/sources/1/content?limit=5"
```

**Parâmetros de Query Suportados:**
- `page` (integer, padrão: `1`): Número da página.
- `limit` ou `per_page` (integer, padrão: `10`, máx: `100`): Quantidade de artigos por página.
- `search` (string, opcional): Filtrar artigos por palavra-chave.
- `raw` (boolean, opcional): Se `true`, inclui o payload bruto original da fonte.

### 2. Consultar Mídias e Uploads de um Portal (`/api/media/{id}/content`)

Retorna a lista de imagens, fotos, uploads e anexos diretamente do endpoint de mídia do WordPress.

```bash
# Exemplo: Obter as últimas 5 mídias da fonte de mídia 28
curl -H "x-api-key: <SUA_API_KEY>" "https://seu-dominio.workers.dev/api/media/28/content?limit=5"
```

---

## Desenvolvimento e Deploy

```bash
npm install
npm run dev           # Servidor local de desenvolvimento (porta 3000)
npm run build         # Build do Next.js
npm run build:cloudflare  # Build para Cloudflare Workers via OpenNext
npm run deploy        # Deploy para Cloudflare Workers
```

---

© 2026 News Sources API. Todos os direitos reservados.
