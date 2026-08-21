# News Sources API

API REST para acesso a fontes de notícias e endpoints de mídia brasileiras agregadas de diversos portais. Todos os endpoints são protegidos por API Key.

## Documentação

- A documentação interativa (Swagger UI / RapiDoc) está disponível na página inicial do app e na rota `/docs`.
- A documentação completa em texto está no arquivo `API_DOCS.md`.

## Autenticação

Todos os endpoints exigem uma API Key, que pode ser enviada de três formas:

1. Header `Authorization: Bearer <sua-chave>`
2. Header `x-api-key: <sua-chave>`
3. Query parameter `?api_key=<sua-chave>`

> **Produção:** Em produção no Cloudflare Workers, a `API_KEY` deve ser configurada via Secret ou variável de ambiente no Worker.

---

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/sources` | Lista paginada de fontes de notícias (filtros: category, type, active, stats) |
| GET | `/api/sources/{id}` | Fonte de notícia específica por ID |
| GET | `/api/sources/category/{category}` | Fontes filtradas por categoria |
| GET | `/api/media` | Lista completa de endpoints de mídia WordPress (`/wp-json/wp/v2/media`) com filtro `?active=true` |
| GET | `/api/media/{id}` | Endpoint de mídia específico por ID |
| GET | `/api/categories` | Lista de categorias com contagem de fontes |
| GET | `/api/types` | Lista de tipos com contagem de fontes |
| GET | `/api/stats` | Estatísticas gerais da API |
| GET | `/api/openapi.json` | Especificação OpenAPI 3.0.3 (JSON) |

---

## Novo Endpoint: Media (`/api/media`)

O endpoint de mídia fornece as rotas da API REST do WordPress para upload e consumo de mídias (`/wp-json/wp/v2/media`) das fontes cadastradas.

### 1. Listar todas as fontes de mídia
```bash
GET /api/media?api_key=<SUA_API_KEY>
```
**Filtros disponíveis:**
- `active` (boolean, opcional): `true` ou `false` para filtrar por fontes de mídia ativas.

**Exemplo com cURL:**
```bash
curl -H "x-api-key: <SUA_API_KEY>" "https://seu-dominio.workers.dev/api/media?active=true"
```

**Exemplo de Resposta (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "category": "Tocantins",
      "site": "exemplo.com.br",
      "type": "wp-api",
      "url": "https://exemplo.com.br/wp-json/wp/v2/media",
      "active": true
    }
  ],
  "meta": {
    "total": 27
  }
}
```

### 2. Obter fonte de mídia por ID
```bash
GET /api/media/{id}?api_key=<SUA_API_KEY>
```

**Exemplo com cURL:**
```bash
curl -H "x-api-key: <SUA_API_KEY>" "https://seu-dominio.workers.dev/api/media/1"
```

---

## Desenvolvimento Local

```bash
npm install
npm run dev    # servidor de desenvolvimento local
npm run build  # compilação Next.js
npm start      # iniciar servidor de produção Node.js
```

---

## Cloudflare Workers

Este projeto usa `@opennextjs/cloudflare` para executar o Next.js no runtime Edge dos Cloudflare Workers.

Para compilar e publicar no Cloudflare:

```bash
npm run build:cloudflare
npm run deploy
```

O arquivo `wrangler.jsonc` contém a configuração do Worker `news-sources-api` com a flag `nodejs_compat`.

---

© 2026 News Sources API. Todos os direitos reservados.
