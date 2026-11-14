# News & Media Sources API

API REST para acesso centralizado a fontes de notícias brasileiras, conteúdos em tempo real (posts, matérias jornalísticas e artigos) e uploads de mídia (imagens, anexos e fotos), padronizando saídas de REST APIs WordPress (`wp-api`) e feeds XML (`rss`).

> **Domínio Base Atual (`NEXT_PUBLIC_BASE_URL`):**
> `{APP_URL}`

---

## Autenticação

Todos os endpoints protegidos exigem autenticação por credencial de acesso (rotas públicas como `/api`, `/api/health`, `/api/version`, `/api/openapi.json` e `/api/sync` não exigem autenticação). A credencial pode ser informada de 3 formas:

1. **Header de Autorização Bearer (Recomendado):**
   ```http
   Authorization: Bearer <sua-chave>
   ```
2. **Header Customizado:**
   ```http
   x-api-key: <sua-chave>
   ```
3. **Query Parameter (`ref`):**
   ```http
   ?ref=<sua-chave>
   ```

Quando utilizada via query string em URLs que já possuem outros parâmetros (como `page`, `limit` ou `category`), combine-a usando `&`:
```text
{APP_URL}/api/news/6571187291942?page=1&limit=10&ref=<sua-chave>
```

> **Configuração em Produção no Netlify:**
> Acesse **Site Configuration > Environment Variables** no painel do Netlify e cadastre a variável `API_KEY`. O sistema lê essa variável estritamente em tempo de execução sem expor credenciais no código-fonte.

---

## Arquitetura Unificada de Dados

Todas as fontes de dados e endpoints de mídia estão centralizados em um único arquivo:
- `app/data/sources.json`: Contém todas as fontes ativas com URLs de posts (`url`) e URLs de mídia (`mediaUrl`).
- **IDs Unificados:** Cada portal possui um ID único de 15 dígitos. O mesmo ID é utilizado tanto para ler as matérias (`/api/news/{id}`) quanto para ler as imagens e uploads (`/api/images/{id}`).
- **Atualização Automática:** Qualquer adição, alteração ou remoção de fontes no arquivo `app/data/sources.json` reflete instantaneamente em toda a API, documentação Swagger UI e RapiDoc.

---

## Documentação Interativa

- **Swagger UI**: Disponível na página inicial (`{APP_URL}/`).
- **RapiDoc**: Disponível na rota dedicada (`{APP_URL}/docs`).
- **Especificação OpenAPI 3.0.3 (JSON)**: `{APP_URL}/api/openapi.json`.

---

## Endpoints da API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `{APP_URL}/api` | Página inicial da API em JSON (índice, status e links HATEOAS) |
| GET | `{APP_URL}/api/news` | Lista de fontes de notícias cadastradas (filtros: `category`, `type`, `active`) |
| GET | `{APP_URL}/api/news/{id}` | Notícias em tempo real da fonte `{id}` |
| GET | `{APP_URL}/api/news/category/{category}` | Fontes filtradas por categoria |
| GET | `{APP_URL}/api/images` | Lista de fontes com suporte a mídia e uploads |
| GET | `{APP_URL}/api/images/{id}` | Mídias e imagens em tempo real da fonte `{id}` |
| GET | `{APP_URL}/api/categories` | Categorias disponíveis com total de fontes |
| GET | `{APP_URL}/api/types` | Tipos suportados (`wp-api`, `rss`) com totais |
| GET | `{APP_URL}/api/stats` | Estatísticas gerais da API (`?detailed=true` para relatório completo) |
| GET | `{APP_URL}/api/stats/news` | Relatório completo de notícias e páginas de todas as fontes e categorias |
| GET | `{APP_URL}/api/health` | Verificação de integridade e uptime (Público, sem auth) |

> **Nota sobre campos `alt` e `slug`:** As tags `alt` e `slug` foram removidas das listagens iniciais de fontes (`/api/images` e `/api/news`) e estão presentes apenas nos endpoints onde consta cada notícia ou mídia (`/api/news/{id}` e `/api/images/{id}`), identificando o texto alternativo e slug diretamente associados a cada notícia/imagem.

---

## Paginação e Formulação de URLs

Os endpoints de conteúdo retornam os dados paginados com suporte a HATEOAS, `nestjs-typeorm-paginate` e metadados nos cabeçalhos HTTP:
- `X-WP-Total`: Total de registros disponíveis no servidor de origem.
- `X-WP-TotalPages`: Total de páginas disponíveis.

### Como Formular as URLs de Paginação

A URL correta deve utilizar o caractere `&` para separar os parâmetros da query string (em vez de um segundo `?`):

```text
{APP_URL}/api/images/1216294345584?page=1&ref=<key>
```

**Exemplo com chave preenchida:**
```text
{APP_URL}/api/images/1216294345584?page=1&ref=<sua-chave>
```

#### Alternativas recomendadas via Headers (URL limpa):
Para maior segurança e evitar expor a chave de API no histórico do navegador ou em logs de requisição, você pode manter a URL sem o parâmetro e enviar a chave no cabeçalho:

**URL:**
```text
{APP_URL}/api/images/1216294345584?page=1
```

**Header (Opção 1 - Bearer):**
```http
Authorization: Bearer <sua-chave>
```

**Header (Opção 2 - Customizado):**
```http
x-api-key: <sua-chave>
```

### Exemplos de Requisição cURL:

**Buscar Notícias:**
```bash
curl -i "{APP_URL}/api/news/6571187291942?page=1&limit=5" \
  -H "Authorization: Bearer <sua-chave>"
```

**Buscar Imagens / Mídias:**
```bash
curl -i "{APP_URL}/api/images/6571187291942?page=1&limit=5" \
  -H "Authorization: Bearer <sua-chave>"
```

---

## Página Inicial da API em JSON (`GET /api`)

A API disponibiliza uma página inicial estruturada em JSON na rota `/api` (acesso público, sem necessidade de autenticação), exibindo metadados do serviço, visão geral do catálogo, formas de autenticação, mapa de rotas e links HATEOAS.

### Como Acessar:

```bash
curl -s "{APP_URL}/api"
```

Ou via query / navegador:
```text
{APP_URL}/api
```

### Exemplo de Resposta:
```json
{
  "success": true,
  "name": "News & Media Sources API",
  "version": "1.0.0",
  "status": "online",
  "baseUrl": "{APP_URL}",
  "authentication": {
    "required": true,
    "publicRoutes": ["/api", "/api/health", "/api/version", "/api/openapi.json", "/api/sync"],
    "methods": [
      "Authorization: Bearer <chave>",
      "Header: x-api-key: <chave>",
      "Query parameter: ?ref=<chave>"
    ]
  },
  "overview": {
    "totalSources": 80,
    "activeSources": 80,
    "totalMediaSources": 35,
    "totalCategories": 50
  },
  "endpoints": { ... },
  "_links": { ... }
}
```

---

## Estatísticas Globais de Notícias e Páginas (`GET /api/stats/news`)

Além do resumo cadastral em `GET /api/stats`, a API disponibiliza o relatório consolidado em tempo real em **`/api/stats/news`** (também acessível via `/stats/news` ou `GET /api/stats?detailed=true`), documentando quantas notícias existem atualmente na API e quantas páginas estão disponíveis em cada fonte e em cada categoria.

### Como Acessar:

- **Via Header (Recomendado):**
  ```bash
  curl -s "{APP_URL}/api/stats/news?limit=10" \
    -H "Authorization: Bearer <sua-chave>"
  ```
- **Via Query String (`ref`):**
  ```text
  {APP_URL}/api/stats/news?limit=10&ref=<sua-chave>
  ```
- **Filtrando por Categoria ou Tipo:**
  ```text
  {APP_URL}/api/stats/news?category=Tocantins&limit=10&ref=<sua-chave>
  {APP_URL}/api/stats/news?type=wp-api&refresh=true&ref=<sua-chave>
  ```

### Parâmetros Suportados:
| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `limit` / `per_page` | integer | `10` | Quantidade de itens por página utilizada no cálculo de páginas (1 a 30) |
| `category` | string | - | Filtra o relatório para uma categoria específica (nome ou slug) |
| `type` | string | - | Filtra o relatório por protocolo (`wp-api` ou `rss`) |
| `refresh` | boolean | `false` | Se `true`, ignora o cache em memória e consulta novamente todas as fontes |

### Estrutura da Resposta:
O retorno inclui os blocos padronizados **`meta`** e **`page`** no nível global, dentro de cada categoria (`categories`) e em cada fonte (`sources`):

```json
{
  "success": true,
  "status": "ok",
  "itemsPerPage": 10,
  "meta": {
    "itemCount": 10,
    "totalItems": 17638,
    "itemsPerPage": 10,
    "totalPages": 1764,
    "currentPage": 1
  },
  "page": {
    "size": 10,
    "totalElements": 17638,
    "totalPages": 1764,
    "number": 1
  },
  "summary": {
    "totalNews": 17638,
    "totalPages": 1764,
    "totalPagesBySourceSum": 1764,
    "totalSources": 80,
    "onlineSources": 78,
    "unavailableSources": 2,
    "totalCategories": 50
  },
  "categories": [ ... ],
  "sources": [
    {
      "id": 8742125891673,
      "category": "Tocantins",
      "type": "wp-api",
      "active": true,
      "status": "online",
      "totalNews": 17638,
      "totalPages": 1764,
      "meta": {
        "itemCount": 10,
        "totalItems": 17638,
        "itemsPerPage": 10,
        "totalPages": 1764,
        "currentPage": 1
      },
      "page": {
        "size": 10,
        "totalElements": 17638,
        "totalPages": 1764,
        "number": 1
      },
      "_links": {
        "self": { "href": "{APP_URL}/api/news/8742125891673?page=1&limit=10" },
        "news": { "href": "{APP_URL}/api/news/8742125891673" },
        "images": { "href": "{APP_URL}/api/images/8742125891673" }
      }
    }
  ]
}
```

---

## Implantação no Cloudflare Pages / Workers

A aplicação está totalmente configurada e otimizada para implantação no Cloudflare Pages e Workers:

1. **Conectar Repositório:** Conecte o repositório Git no dashboard do Cloudflare Pages (**Workers & Pages > Create application > Pages > Connect to Git**).
2. **Configurações de Build:**
   - **Framework preset:** `Next.js`
   - **Build command:** `npm run build` (ou `npm run pages:build`)
   - **Build output directory:** `.next`
   - **Root directory:** `/` (raiz do projeto)
3. **Variáveis de Ambiente (Environment Variables):**
   - `NODE_VERSION`: `22` (ou `20`)
   - `API_KEY`: Sua chave secreta para proteger os endpoints da API.
   - `REVALIDATE_SECRET`: Token para revalidação via webhook.
   - `GOOGLE_ADSENSE_ID` (ou `NEXT_PUBLIC_GOOGLE_ADSENSE_ID`): ID de editor do Google AdSense (`ca-pub-XXXXXXXXXXXXXXXX`) para habilitar **Anúncios Automáticos (Auto Ads)** exclusivamente nas páginas web de frontend (`/`, `/docs`, `/sobre`, `/contato`, `/politica-de-privacidade`, `/termos-de-uso`), sem nenhum `ad-slot` manual e sem afetar os endpoints `/api/*`. Também atualiza automaticamente `/ads.txt`.
   - Opcionalmente `NEXT_PUBLIC_BASE_URL` ou `APP_URL` (se não preenchido, detecta automaticamente o domínio da requisição).
4. **Arquivos SEO, Páginas Legais e Banner LGPD (Frontend):**
   - Raiz (`public/`, `server.js` e `worker.js`): `/ads.txt`, `/robots.txt` (`Mediapartners-Google`, `Googlebot`) e `/sitemap.xml`.
   - Páginas institucionais: `/politica-de-privacidade` (com cláusula de cookie DART / Google AdSense), `/termos-de-uso`, `/contato` e `/sobre`.
   - Banner de Consentimento de Cookies (LGPD/GDPR) no rodapé com opções **Aceitar** e **Recusar** persistidas em `localStorage`.
5. **Flags de Compatibilidade:**
   - O arquivo `wrangler.toml` já inclui `compatibility_flags = ["nodejs_compat"]` e `compatibility_date = "2024-09-23"` garantindo suporte pleno ao runtime Node.js.

---

## Implantação no Netlify (Serverless)

A aplicação está configurada para deploy contínuo e sem servidor no Netlify:

1. **Conectar Repositório:** Conecte o repositório Git ao Netlify.
2. **Configuração de Build Automática:**
   - **Build Command:** `npm run build`
   - **Publish Directory:** `.next`
   - **Plugin:** `@netlify/plugin-nextjs` (configurado em `netlify.toml`)
3. **Variáveis de Ambiente:**
   - Cadastre `API_KEY` com a senha desejada para proteger os endpoints.
   - Opcionalmente cadastre `NEXT_PUBLIC_BASE_URL` caso utilize domínio personalizado.
   - Opcionalmente cadastre `REVALIDATE_SECRET`.
   - Opcionalmente cadastre `GOOGLE_ADSENSE_ID` (ou `NEXT_PUBLIC_GOOGLE_ADSENSE_ID`) com seu ID `ca-pub-XXXXXXXXXXXXXXXX` para ativar Anúncios Automáticos do Google AdSense apenas no frontend (`/` e `/docs`).

---

## Sincronização Contínua e Atualização Automática

### 1. ISR em Segundo Plano (20 segundos)
- O Next.js utiliza revalidação de 20 segundos (`revalidate: 20`) tanto nas consultas à API quanto nas rotas estáticas.
- A cada 20 segundos, o app verifica automaticamente novidades na API REST e no arquivo de fontes (`sources.json`), atualizando dados em segundo plano sem necessidade de recompilação.

### 2. Webhook de Revalidação Instantânea (`/api/revalidate`)
Aceita requisições **GET** e **POST** autenticadas pelo secret token:

- **Revalidação Geral de Todos os Caches:**
  ```text
  GET /api/revalidate?ref=<SUA_CREDENCIAL>&all=true
  ```

- **Revalidação Específica por Matéria / Slug (compatível com WP Webhooks):**
  ```bash
  curl -X POST "{APP_URL}/api/revalidate" \
    -H "Content-Type: application/json" \
    -d '{
      "ref": "<SUA_CREDENCIAL>",
      "slug": "titulo-da-materia",
      "type": "post"
    }'
  ```

### 3. Painel de Status e Sincronização sob Demanda (`/api/sync`)
- **Monitoramento em Tempo Real:**
  ```text
  GET /api/sync
  ```
  Informa status da conexão ao vivo, latência em ms, total de publicações na API e dados do post mais recente.

- **Forçar Sincronização Imediata:**
  ```text
  GET /api/sync?action=sync
  ```
  Invalida todos os caches e força recarga imediata dos dados na hora.

---

## Sincronização Automática de Versões (Cliente / Servidor)

Para prevenir erros de conflito de implantação (*deployment mismatch* ou `ChunkLoadError` quando novos builds são publicados enquanto usuários mantêm abas abertas):

1. **Build ID Determinístico:** O `next.config.mjs` gera um identificador de build unificado por commit/versão (`BUILD_ID`).
2. **Endpoint de Versão (`/api/version`):**
   ```text
   GET /api/version
   ```
   Retorna a versão ativa do servidor com cabeçalho `Cache-Control: no-store` e tags `X-App-Version` e `X-Build-Id`.
3. **Auto-Recuperação de Chunks no Cliente:** O componente invisível `components/DeploymentVersionSync.tsx` intercepta falhas de carregamento de chunks defasados e divergências de versão na retomada de foco da janela, efetuando auto-recarga limpa e transparente sem travar o aplicativo nem exigir intervenção manual do usuário.


