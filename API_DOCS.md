# News & Media Sources API - Documentação Técnica Completa

Esta documentação técnica descreve a arquitetura unificada, os endpoints, modelos de autenticação e parâmetros de consulta da **News & Media Sources API**.

> **Domínio Base Configurado (`NEXT_PUBLIC_BASE_URL`):**
> `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app`
> *(Ao fazer deploy no Netlify ou utilizar domínio próprio, configure o valor na variável `NEXT_PUBLIC_BASE_URL` para atualizar todos os exemplos e gateways automaticamente).*

---

## 1. Arquitetura Unificada de Dados

Todas as fontes e endpoints de conteúdo estão centralizados exclusivamente no arquivo `app/data/sources.json`. O arquivo anterior `media.json` foi eliminado, eliminando duplicações e unificando os identificadores.

### Características da Arquitetura:
- **Identificador Único (ID de 13 dígitos sem o número 0):** O mesmo ID de fonte identifica tanto o endpoint de notícias quanto o endpoint de imagens/mídias.
  - Formato estrito: exatamente 13 dígitos numéricos contendo apenas números de 1 a 9 (sem o zero).
  - Exemplo: Portal `clebertoledo.com.br` possui o ID unificado `6571187291942`.
  - Notícias: `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/6571187291942`
  - Imagens: `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/6571187291942`
- **Isolamento de Backend e Limpeza de Tags:**
  - As tags internas de backend (`site`, `url`, `mediaUrl`, `link`) são restritas ao backend e não são expostas nos endpoints públicos.
  - As tags `slug` e `alt` não são incluídas nos endpoints iniciais de listagem de fontes (`/api/images` e `/api/news`), mantendo a estrutura inicial limpa e sem tags redundantes.
  - As tags `slug` e `alt` estão presentes exclusivamente onde são de fato necessárias: nos endpoints onde consta cada notícia ou imagem (`/api/news/{id}` e `/api/images/{id}`), identificando com exatidão o slug da matéria e o alt text da fotografia/ilustração destacada.
  - Os endpoints expõem apenas a notícia com conteúdo limpo e a URL direta da imagem (`imageUrl`) para incorporação imediata.
- **Deduplicação de Imagens:**
  - Cada notícia possui sua própria imagem única advinda da API; repetições da mesma imagem no mesmo endpoint são automaticamente eliminadas.
- **HATEOAS & Paginação Avançada:**
  - Respostas formatadas de acordo com as especificações do Spring HATEOAS (`_links`, `_embedded`, `page`) e `nestjs-typeorm-paginate` (`items`, `meta`, `links`).
  - Cabeçalhos de compatibilidade `X-WP-Total` e `X-WP-TotalPages` mantidos.
- **Revisão e Limpeza com IA (Pollinations):**
  - Notícias oriundas de feeds RSS/XML passam por sanitização prévia e revisão via IA Pollinations (ou endpoint privado configurado), eliminando emojis, selos de verificação, pedidos de WhatsApp e frases curtas isoladas.
- **Atualização Automática:** Ao adicionar, modificar ou desativar qualquer fonte no arquivo `app/data/sources.json`, toda a API, documentação Swagger UI e RapiDoc (`/docs`) atualizam seus endpoints dinamicamente sem necessidade de recodificação.

---

## 2. Autenticação Global

Com exceção única da rota de verificação de saúde (`https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/health`), todos os endpoints exigem validação de chave de acesso.

A autenticação pode ser enviada por qualquer uma das três formas abaixo:

1. **Header de Autorização Bearer (Recomendado):**
   ```http
   Authorization: Bearer <sua-chave>
   ```
2. **Header Customizado:**
   ```http
   x-api-key: <sua-chave>
   ```
3. **Query Parameter na URL:**
   ```http
   https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news?api_key=<sua-chave>
   ```

> **Segurança:** A chave de API nunca é exposta no código-fonte. Em produção no Netlify, ela é lida diretamente da variável de ambiente `API_KEY`.

---

## 3. Formato de Resposta e Paginação (Padrão WordPress REST API)

Os endpoints de conteúdo em tempo real retornam uma lista direta de itens (`[ ... ]`) e os dados de paginação são expostos nos cabeçalhos HTTP da resposta:

- `X-WP-Total`: Total de registros encontrados no portal de origem.
- `X-WP-TotalPages`: Total de páginas disponíveis para navegação.

### Parâmetros de Consulta Suportados:

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | integer | `1` | Número da página solicitada |
| `limit` / `per_page` | integer | `10` | Quantidade de itens por página (máx. 100) |
| `search` | string | - | Termo de busca para filtrar notícias ou fotos |
| `raw` | boolean | `false` | Se `true`, inclui o payload bruto original do portal no campo `raw` |
| `meta` | boolean | `false` | Se `true`, retorna apenas o registro cadastral da fonte (sem consultar a rede) |

### 3.1. Como Formular as URLs de Paginação

A URL correta deve utilizar o caractere `&` para separar os parâmetros da query string (em vez de um segundo `?`):

```text
https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/1216294345584?page=1&api_key=<key>
```

**Exemplo com chave preenchida:**
```text
https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/1216294345584?page=1&api_key=bn_88feb5baa3f84955677e8c11453aae352811b9fe6c3398cd
```

#### Alternativas recomendadas via Headers (URL limpa):
Para maior segurança e evitar expor a chave de API no histórico do navegador ou em logs de requisição, você pode manter a URL sem o parâmetro e enviar a chave no cabeçalho:

**URL:**
```text
https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/1216294345584?page=1
```

**Header (Opção 1 - Bearer):**
```http
Authorization: Bearer <key>
```

**Header (Opção 2 - Customizado):**
```http
x-api-key: <key>
```

---

## 4. Endpoints Globais

### 4.1. Notícias e Artigos

- **Listar Todas as Fontes de Notícias:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news?page=1&limit=20&category=Tocantins
  ```
- **Conteúdo em Tempo Real de uma Fonte:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/{id}?page=1&limit=10&search=educacao
  ```
- **Filtrar Fontes por Categoria:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/category/{categoria}
  ```

### 4.2. Mídias e Imagens

- **Listar Fontes com Mídia Ativa:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images
  ```
- **Uploads e Imagens em Tempo Real de uma Fonte:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/{id}?page=1&limit=10
  ```
  *Também suporta passagem direta via query param:* `GET /api/images?id={id}&limit=10`

#### Estrutura do JSON de Resposta (Mídias e Imagens):

Cada item retornado inclui as tags **`slug`** (contendo o slug exato da notícia) e **`alt`** (preenchida com o título integral da notícia), garantindo perfeita indexação e associação semântica de **título / imagem / notícia** ao integrar com outros aplicativos (WordPress, CMS, robôs de redes sociais, geradores de cards e agregadores móveis):

```json
[
  {
    "id": 3865522,
    "title": "Quais os clubes mais prejudicados com a mudança da regra de estrangeiros no Brasileirão",
    "slug": "quais-os-clubes-mais-prejudicados-com-a-mudanca-da-regra-de-estrangeiros-no-brasileirao",
    "alt": "Quais os clubes mais prejudicados com a mudança da regra de estrangeiros no Brasileirão",
    "link": "https://www.gazetaesportiva.com/times/quais-os-clubes-mais-prejudicados-com-a-mudanca-da-regra-de-estrangeiros-no-brasileirao/",
    "description": "Análise sobre o impacto da nova quantidade permitida de jogadores estrangeiros nos elencos da Série A...",
    "pubDate": "2026-10-02T19:30:00.000Z",
    "imageUrl": "https://static.gazetaesportiva.com/uploads/2026/10/foto-elencos-brasileirao.webp",
    "mediaUrl": "https://static.gazetaesportiva.com/uploads/2026/10/foto-elencos-brasileirao.webp"
  }
]
```

- **`slug`**: O slug oficial da notícia no portal (ex.: `quais-os-clubes-mais-prejudicados-com-a-mudanca-da-regra-de-estrangeiros-no-brasileirao`), nunca o slug técnico do arquivo de imagem.
- **`alt`**: O título integral da matéria jornalística (ex.: `Quais os clubes mais prejudicados com a mudança da regra de estrangeiros no Brasileirão`) para facilitar a associação automática de título/imagem em integrações com outros apps.
- **`imageUrl` / `mediaUrl`**: Link direto da fotografia destacada em alta resolução associada à notícia.

### 4.3. Metadados e Uptime

- **Categorias Disponíveis:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/categories
  ```
- **Tipos de Fontes (`wp-api` e `rss`):**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/types
  ```
- **Estatísticas Globais:**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/stats
  ```
- **Health Check (Público):**
  ```http
  GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/health
  ```

---

## 5. Tabela de Fontes Principais (IDs Unificados)

Abaixo estão listadas fontes ativas configuradas no `app/data/sources.json`:

| ID Unificado | Categoria | Portal / Site | Tipo | Endpoint de Notícias | Endpoint de Mídia |
|---|---|---|---|---|---|
| `528374619283746` | Justiça | ambitojuridico.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/528374619283746` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/528374619283746` |
| `194728365019283` | Justiça | justa.org.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/194728365019283` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/194728365019283` |
| `736482910573649` | Justiça | odireito.com | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/736482910573649` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/736482910573649` |
| `813947265038471` | Justiça | rotajuridica.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/813947265038471` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/813947265038471` |
| `383841537673882` | Tocantins | clebertoledo.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/383841537673882` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/383841537673882` |
| `893766336492326` | Educação | infoeducacao.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/893766336492326` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/893766336492326` |
| `119282349536522` | Justiça | nacaojuridica.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/119282349536522` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/119282349536522` |
| `138781293968447` | Tocantins | atitudeto.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/138781293968447` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/138781293968447` |
| `912241216478934` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/912241216478934` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/912241216478934` |
| `119319283249741` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/119319283249741` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/119319283249741` |
| `673832516549963` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/673832516549963` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/673832516549963` |
| `859131619791157` | Economia | minhaseconomias.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/859131619791157` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/859131619791157` |
| `331649958919499` | Esporte | gazetaesportiva.com | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/331649958919499` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/331649958919499` |
| `263228425877841` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/263228425877841` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/263228425877841` |
| `914761953262293` | Finanças | classic.exame.com | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/914761953262293` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/914761953262293` |
| `484292183833791` | Palmeiras | palmeiras.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/484292183833791` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/484292183833791` |
| `699842191757118` | Goiás | opiniaogoias.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/699842191757118` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/699842191757118` |
| `431642583394448` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/431642583394448` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/431642583394448` |
| `232452491983424` | Goiás | diariodegoias.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/232452491983424` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/232452491983424` |
| `382992878388555` | Justiça | conjur.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/382992878388555` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/382992878388555` |
| `214239935451987` | Tocantins | vozdobico.com.br | `wp-api` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/214239935451987` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/214239935451987` |
| `427785761975213` | Notícias Gerais | g1.globo.com | `rss` | `GET https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/427785761975213` | - |

---

## 6. Documentação Interativa RapiDoc e Swagger UI

- **Swagger UI (`https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/`):** Interface visual para teste imediato de requisições com botão **Authorize**.
- **RapiDoc (`https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/docs`):** Interface de documentação técnica baseada em Web Components para exploração profunda da especificação OpenAPI 3.0.3.

---

## 7. Guia de Deploy no Netlify

O projeto é 100% compatível com a infraestrutura serverless do Netlify.

### Passos de Instalação:
1. Faça o upload do projeto para seu repositório Git (GitHub, GitLab, Bitbucket).
2. No painel do Netlify, selecione **"Add new site" > "Import an existing project"**.
3. Confirme os parâmetros definidos no `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
4. Na aba **Site configuration > Environment variables**, adicione:
   - `API_KEY`: Defina uma chave segura para proteger a API.
   - `NEXT_PUBLIC_BASE_URL`: URL do seu domínio Netlify ou personalizado (ex: `https://seu-dominio.netlify.app` ou `https://api.seudominio.com`).
5. Inicie o deploy.
