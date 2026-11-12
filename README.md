# News & Media Sources API

API REST para acesso centralizado a fontes de notícias brasileiras, conteúdos em tempo real (posts, matérias jornalísticas e artigos) e uploads de mídia (imagens, anexos e fotos), padronizando saídas de REST APIs WordPress (`wp-api`) e feeds XML (`rss`).

> **Domínio Base Atual (`NEXT_PUBLIC_BASE_URL`):**
> `{APP_URL}`

---

## Autenticação

Todos os endpoints (com exceção exclusiva de `/api/health`) exigem autenticação por API Key. A chave pode ser informada de 3 formas:

1. **Header de Autorização Bearer (Recomendado):**
   ```http
   Authorization: Bearer <sua-chave>
   ```
2. **Header Customizado:**
   ```http
   x-api-key: <sua-chave>
   ```
3. **Query Parameter:**
   ```http
   ?api_key=<sua-chave>
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
| GET | `{APP_URL}/api/news` | Lista de fontes de notícias cadastradas (filtros: `category`, `type`, `active`) |
| GET | `{APP_URL}/api/news/{id}` | Notícias em tempo real da fonte `{id}` |
| GET | `{APP_URL}/api/news/category/{category}` | Fontes filtradas por categoria |
| GET | `{APP_URL}/api/images` | Lista de fontes com suporte a mídia e uploads |
| GET | `{APP_URL}/api/images/{id}` | Mídias e imagens em tempo real da fonte `{id}` |
| GET | `{APP_URL}/api/categories` | Categorias disponíveis com total de fontes |
| GET | `{APP_URL}/api/types` | Tipos suportados (`wp-api`, `rss`) com totais |
| GET | `{APP_URL}/api/stats` | Estatísticas gerais da API |
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
{APP_URL}/api/images/1216294345584?page=1&api_key=<key>
```

**Exemplo com chave preenchida:**
```text
{APP_URL}/api/images/1216294345584?page=1&api_key=your_api_key_here
```

#### Alternativas recomendadas via Headers (URL limpa):
Para maior segurança e evitar expor a chave de API no histórico do navegador ou em logs de requisição, você pode manter a URL sem o parâmetro e enviar a chave no cabeçalho:

**URL:**
```text
{APP_URL}/api/images/1216294345584?page=1
```

**Header (Opção 1 - Bearer):**
```http
Authorization: Bearer <key>
```

**Header (Opção 2 - Customizado):**
```http
x-api-key: <key>
```

### Exemplos de Requisição cURL:

**Buscar Notícias:**
```bash
curl -i "{APP_URL}/api/news/6571187291942?page=1&limit=5" \
  -H "Authorization: Bearer SUA_API_KEY"
```

**Buscar Imagens / Mídias:**
```bash
curl -i "{APP_URL}/api/images/6571187291942?page=1&limit=5" \
  -H "Authorization: Bearer SUA_API_KEY"
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
   - Opcionalmente `NEXT_PUBLIC_BASE_URL` ou `APP_URL` (se não preenchido, detecta automaticamente a URL `*.pages.dev`).
4. **Flags de Compatibilidade:**
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

---

## Sincronização Contínua e Atualização Automática

### 1. ISR em Segundo Plano (20 segundos)
- O Next.js utiliza revalidação de 20 segundos (`revalidate: 20`) tanto nas consultas à API quanto nas rotas estáticas.
- A cada 20 segundos, o app verifica automaticamente novidades na API REST e no arquivo de fontes (`sources.json`), atualizando dados em segundo plano sem necessidade de recompilação.

### 2. Webhook de Revalidação Instantânea (`/api/revalidate`)
Aceita requisições **GET** e **POST** autenticadas pelo secret token:

- **Revalidação Geral de Todos os Caches:**
  ```text
  GET /api/revalidate?secret=camara-paraiso-revalidate-secret-token&all=true
  ```

- **Revalidação Específica por Matéria / Slug (compatível com WP Webhooks):**
  ```bash
  curl -X POST "{APP_URL}/api/revalidate" \
    -H "Content-Type: application/json" \
    -d '{
      "secret": "camara-paraiso-revalidate-secret-token",
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


