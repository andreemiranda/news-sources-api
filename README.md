# News Sources API

API REST para acesso a fontes de notícias, endpoints de mídia e conteúdos em tempo real (posts, artigos, imagens e uploads) de portais brasileiros.

## Autenticação

Todos os endpoints exigem envio da API Key em um dos seguintes formatos:
1. Header `Authorization: Bearer <sua-chave>`
2. Header `x-api-key: <sua-chave>`
3. Query parameter `?api_key=<sua-chave>`

> **Configuração em Produção:** No Cloudflare Workers, Netlify ou Render, cadastre o segredo ou variável de ambiente `API_KEY`.

---

## Documentação Interativa

- **Swagger UI**: Disponível na página inicial (`/`).
- **RapiDoc**: Disponível na rota de documentação (`/docs`).
- **Especificação OpenAPI 3.0.3**: `/api/openapi.json`.

---

## Sumário de Endpoints Globais

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/news` | Lista paginada das 72 fontes de notícias (filtros: `category`, `type`, `active`, `stats`) |
| GET | `/api/news/{id}` | **Conteúdo em tempo real** da fonte de notícias {id} — posts, artigos, autores, imagens (WordPress e RSS). Suporta a flag `?meta=true` para obter apenas os metadados. |
| GET | `/api/news/category/{category}` | Lista de fontes filtradas por categoria |
| GET | `/api/images` | Lista completa dos 27 endpoints de mídia WordPress (`/wp-json/wp/v2/media`) |
| GET | `/api/images/{id}` | **Conteúdo de mídia em tempo real** do endpoint {id} — imagens, fotos, anexos e PDFs. Suporta a flag `?meta=true` para obter apenas os metadados. |
| GET | `/api/categories` | Lista de categorias com contagem de fontes |
| GET | `/api/types` | Lista de tipos de integração (`wp-api`, `rss`) com contagem de fontes |
| GET | `/api/stats` | Estatísticas gerais da API |
| GET | `/api/openapi.json` | Especificação OpenAPI 3.0.3 (JSON) |

---

## Documentação Completa e Lista de Endpoints

Para a lista detalhada com os endpoints individuais nominais de cada uma das **72 fontes** e dos **27 endpoints de mídia**, e informações completas sobre o formato de resposta (Paginação Padrão WP REST API), consulte o arquivo [`API_DOCS.md`](./API_DOCS.md) ou acesse a documentação interativa na página inicial.

---

## Como Usar os Endpoints de Conteúdo em Tempo Real

A partir da última atualização, os conteúdos retornados pela API não são mais encapsulados em `{ success: true, data: [...] }`. Eles são retornados como um **Array Direto** compatível com o padrão do WordPress e os dados de paginação estão alocados nos Headers da requisição (`X-WP-Total` e `X-WP-TotalPages`).

### 1. Consultar Notícias de uma Fonte Específica (`/api/news/{id}`)

Retorna as matérias e publicações atualizadas diretamente do portal (WordPress REST API ou RSS Feed XML).

```bash
# Exemplo: Obter as últimas 5 notícias (substitua o ID por um ID válido)
curl -i "https://seu-dominio.com/api/news/383841537673882?limit=5"
```

### 2. Consultar Mídias e Uploads de um Portal (`/api/images/{id}`)

Retorna a lista de imagens, fotos, uploads e anexos diretamente do endpoint de mídia do WordPress.

```bash
# Exemplo: Obter as últimas 5 mídias
curl -i "https://seu-dominio.com/api/images/486786913592927?limit=5"
```

---

## Desenvolvimento e Deploy

```bash
npm install
npm run dev           # Servidor local de desenvolvimento (porta 3000)
npm run build         # Build do Next.js
npm run start         # Iniciar servidor em produção
```

O projeto foi refatorado para funcionar em modo _Serverless_ (sem dependência de banco de dados ou estado persistente via disco em tempo de execução), permitindo deploy nativo na Vercel, Netlify e outras plataformas.
