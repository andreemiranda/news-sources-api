const fs = require('fs');
const sourcesData = JSON.parse(fs.readFileSync('data/sources.json', 'utf8')).sources;
const mediaData = JSON.parse(fs.readFileSync('data/media.json', 'utf8')).sources;

const sourcesTable = sourcesData.map(s => `| \`${s.id}\` | ${s.category} | ${s.site} | \`${s.type}\` | \`GET /api/news/${s.id}\` |`).join('\n');
const mediaTable = mediaData.map(s => `| \`${s.id}\` | ${s.category} | ${s.site} | \`${s.type}\` | \`GET /api/images/${s.id}\` |`).join('\n');

const apiDocsContent = `# News Sources API - Documentação Completa

Bem-vindo à documentação detalhada da News Sources API. Esta API serve como um proxy e agregador em tempo real, permitindo acessar de forma unificada os dados, notícias e imagens de dezenas de portais brasileiros, padronizando saídas de REST APIs de WordPress e Feeds RSS.

> **Importante:** A autenticação por API Key foi **removida** para uso público dos endpoints.

## 1. Paginação e Formato de Resposta (Padrão WordPress)

Os endpoints de conteúdo (\`/api/news/[id]\` e \`/api/images/[id]\`) seguem estritamente o padrão da API REST do WordPress (WP REST API):
- A resposta é um **Array JSON** direto (\`[ { ... }, { ... } ]\`) e não um objeto encapsulado.
- Os metadados de paginação são informados via **Cabeçalhos HTTP (Headers)** na resposta:
  - \`X-WP-Total\`: Número total de itens disponíveis no servidor de origem.
  - \`X-WP-TotalPages\`: Número total de páginas disponíveis.

## 2. Parâmetros de Consulta (Query Params) Disponíveis nos Endpoints de Conteúdo

Ao consultar conteúdos (\`/api/news/[id]\` ou \`/api/images/[id]\`), você pode utilizar os seguintes parâmetros:
- \`page\` (integer, padrão: \`1\`): Número da página.
- \`limit\` ou \`per_page\` (integer, padrão: \`10\`, máx: \`100\`): Quantidade de itens por página.
- \`search\` (string): Filtrar o conteúdo por palavra-chave.
- \`raw\` (boolean, \`true\` ou \`false\`): Se \`true\`, inclui o payload bruto original da fonte na propriedade \`raw\` de cada item (útil para auditoria ou campos personalizados).
- \`meta\` (boolean, \`true\` ou \`false\`): Se \`true\`, o endpoint retorna apenas os metadados cadastrados daquela fonte específica (ID, site, categoria, URL original), sem buscar o conteúdo em tempo real.

---

## 3. Fontes de Notícias (Endpoints de Conteúdo)

A tabela abaixo lista nominalmente todas as fontes de notícias cadastradas, seus IDs (15 dígitos não-zero) e os endpoints correspondentes.

| ID | Categoria | Portal / Site | Tipo | Endpoint de Conteúdo em Tempo Real |
|---|---|---|---|---|
${sourcesTable}

---

## 4. Fontes de Mídia e Imagens (Endpoints de Mídia)

A tabela abaixo lista todos os endpoints de mídia cadastrados. Esses endpoints consomem as rotas de mídia do WordPress (\`/wp-json/wp/v2/media\`) para listar uploads, imagens destacadas, arquivos e PDFs.

| ID | Categoria | Portal / Site | Tipo | Endpoint de Mídia em Tempo Real |
|---|---|---|---|---|
${mediaTable}

---

## 5. Exemplos Práticos de Requisição e Resposta

### 5.1. Exemplo: Notícias em Tempo Real de uma Fonte (\`GET /api/news/${sourcesData[0]?.id || '111111111111111'}\`)

**Requisição cURL:**
\`\`\`bash
curl -i "https://seu-dominio.com/api/news/${sourcesData[0]?.id || '111111111111111'}?page=1&limit=2"
\`\`\`

**Resposta (200 OK):**
\`\`\`http
HTTP/2 200 
content-type: application/json; charset=utf-8
x-wp-total: 45000
x-wp-totalpages: 22500

[
  {
    "id": 319687,
    "title": "Avanço nos investimentos e novas iniciativas no estado",
    "link": "https://exemplo.com.br/noticia-exemplo-1",
    "description": "Resumo da matéria jornalística...",
    "content": "<p>Conteúdo integral...</p>",
    "pubDate": "2026-08-21T09:30:00",
    "author": "Redação",
    "imageUrl": "https://exemplo.com.br/wp-content/uploads/imagem.jpg"
  },
  {
    "id": 319686,
    "title": "Outra notícia em tempo real",
    "link": "https://exemplo.com.br/noticia-exemplo-2",
    "description": "Outro resumo..."
  }
]
\`\`\`

---

### 5.2. Exemplo: Mídia em Tempo Real de um Portal (\`GET /api/images/${mediaData[0]?.id || '222222222222222'}\`)

**Requisição cURL:**
\`\`\`bash
curl -i "https://seu-dominio.com/api/images/${mediaData[0]?.id || '222222222222222'}?page=1&limit=2"
\`\`\`

**Resposta (200 OK):**
\`\`\`http
HTTP/2 200 
content-type: application/json; charset=utf-8
x-wp-total: 55000
x-wp-totalpages: 27500

[
  {
    "id": 319688,
    "title": "foto-destaque-evento",
    "link": "https://exemplo.com.br/foto-destaque-evento/",
    "pubDate": "2026-08-21T08:15:00",
    "imageUrl": "https://exemplo.com.br/wp-content/uploads/foto-evento.jpg",
    "mediaUrl": "https://exemplo.com.br/wp-content/uploads/foto-evento.jpg"
  }
]
\`\`\`

---

## 6. Códigos de Status HTTP

| Código | Significado | Descrição |
|---|---|---|
| \`200 OK\` | Sucesso | Requisição processada com êxito e dados retornados |
| \`404 Not Found\` | Não Encontrado | O ID da fonte não existe |
| \`502 Bad Gateway\` | Erro Upstream | Falha temporária ao comunicar com o servidor da fonte externa |

---
© ${new Date().getFullYear()} News Sources API. Todos os direitos reservados.
`;

const readmeContent = `# News Sources API

API REST para acesso a fontes de notícias, endpoints de mídia e conteúdos em tempo real (posts, artigos, imagens e uploads) de portais brasileiros.

> **Importante:** A autenticação via API Key foi **removida** para facilitar o acesso público aos endpoints. O projeto também passou por uma atualização arquitetural, passando a utilizar **IDs puramente numéricos de 15 dígitos**.

## Documentação Interativa

- **Swagger UI**: Disponível na página inicial (\`/\`).
- **RapiDoc**: Disponível na rota de documentação (\`/docs\`).
- **Especificação OpenAPI 3.0.3**: \`/api/openapi.json\`.

---

## Sumário de Endpoints Globais

| Método | Endpoint | Descrição |
|---|---|---|
| GET | \`/api/news\` | Lista paginada das ${sourcesData.length} fontes de notícias (filtros: \`category\`, \`type\`, \`active\`, \`stats\`) |
| GET | \`/api/news/{id}\` | **Conteúdo em tempo real** da fonte de notícias {id} — posts, artigos, autores, imagens (WordPress e RSS). Suporta a flag \`?meta=true\` para obter apenas os metadados. |
| GET | \`/api/news/category/{category}\` | Lista de fontes filtradas por categoria |
| GET | \`/api/images\` | Lista completa dos ${mediaData.length} endpoints de mídia WordPress (\`/wp-json/wp/v2/media\`) |
| GET | \`/api/images/{id}\` | **Conteúdo de mídia em tempo real** do endpoint {id} — imagens, fotos, anexos e PDFs. Suporta a flag \`?meta=true\` para obter apenas os metadados. |
| GET | \`/api/categories\` | Lista de categorias com contagem de fontes |
| GET | \`/api/types\` | Lista de tipos de integração (\`wp-api\`, \`rss\`) com contagem de fontes |
| GET | \`/api/stats\` | Estatísticas gerais da API |
| GET | \`/api/openapi.json\` | Especificação OpenAPI 3.0.3 (JSON) |

---

## Documentação Completa e Lista de Endpoints

Para a lista detalhada com os endpoints individuais nominais de cada uma das **${sourcesData.length} fontes** e dos **${mediaData.length} endpoints de mídia**, e informações completas sobre o formato de resposta (Paginação Padrão WP REST API), consulte o arquivo [\`API_DOCS.md\`](./API_DOCS.md) ou acesse a documentação interativa na página inicial.

---

## Como Usar os Endpoints de Conteúdo em Tempo Real

A partir da última atualização, os conteúdos retornados pela API não são mais encapsulados em \`{ success: true, data: [...] }\`. Eles são retornados como um **Array Direto** compatível com o padrão do WordPress e os dados de paginação estão alocados nos Headers da requisição (\`X-WP-Total\` e \`X-WP-TotalPages\`).

### 1. Consultar Notícias de uma Fonte Específica (\`/api/news/{id}\`)

Retorna as matérias e publicações atualizadas diretamente do portal (WordPress REST API ou RSS Feed XML).

\`\`\`bash
# Exemplo: Obter as últimas 5 notícias (substitua o ID por um ID válido)
curl -i "https://seu-dominio.com/api/news/${sourcesData[0]?.id || '111111111111111'}?limit=5"
\`\`\`

### 2. Consultar Mídias e Uploads de um Portal (\`/api/images/{id}\`)

Retorna a lista de imagens, fotos, uploads e anexos diretamente do endpoint de mídia do WordPress.

\`\`\`bash
# Exemplo: Obter as últimas 5 mídias
curl -i "https://seu-dominio.com/api/images/${mediaData[0]?.id || '222222222222222'}?limit=5"
\`\`\`

---

## Desenvolvimento e Deploy

\`\`\`bash
npm install
npm run dev           # Servidor local de desenvolvimento (porta 3000)
npm run build         # Build do Next.js
npm run start         # Iniciar servidor em produção
\`\`\`

O projeto foi refatorado para funcionar em modo _Serverless_ (sem dependência de banco de dados ou estado persistente via disco em tempo de execução), permitindo deploy nativo na Vercel, Netlify e outras plataformas.
`;

fs.writeFileSync('API_DOCS.md', apiDocsContent);
fs.writeFileSync('README.md', readmeContent);
