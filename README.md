# News & Media Sources API

API REST para acesso centralizado a fontes de notícias brasileiras, conteúdos em tempo real (posts, matérias jornalísticas e artigos) e uploads de mídia (imagens, anexos e fotos), padronizando saídas de REST APIs WordPress (`wp-api`) e feeds XML (`rss`).

> **Domínio Base Atual (`NEXT_PUBLIC_BASE_URL`):**
> `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app`

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

- **Swagger UI**: Disponível na página inicial (`https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/`).
- **RapiDoc**: Disponível na rota dedicada (`https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/docs`).
- **Especificação OpenAPI 3.0.3 (JSON)**: `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/openapi.json`.

---

## Endpoints da API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news` | Lista de fontes de notícias cadastradas (filtros: `category`, `type`, `active`) |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/{id}` | Notícias em tempo real da fonte `{id}` |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/category/{category}` | Fontes filtradas por categoria |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images` | Lista de fontes com suporte a mídia e uploads |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/{id}` | Mídias e imagens em tempo real da fonte `{id}` |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/categories` | Categorias disponíveis com total de fontes |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/types` | Tipos suportados (`wp-api`, `rss`) com totais |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/stats` | Estatísticas gerais da API |
| GET | `https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/health` | Verificação de integridade e uptime (Público, sem auth) |

> **Nota sobre campos `alt` e `slug`:** As tags `alt` e `slug` foram removidas das listagens iniciais de fontes (`/api/images` e `/api/news`) e estão presentes apenas nos endpoints onde consta cada notícia ou mídia (`/api/news/{id}` e `/api/images/{id}`), identificando o texto alternativo e slug diretamente associados a cada notícia/imagem.

---

## Paginação e Formulação de URLs

Os endpoints de conteúdo retornam os dados paginados com suporte a HATEOAS, `nestjs-typeorm-paginate` e metadados nos cabeçalhos HTTP:
- `X-WP-Total`: Total de registros disponíveis no servidor de origem.
- `X-WP-TotalPages`: Total de páginas disponíveis.

### Como Formular as URLs de Paginação

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

### Exemplos de Requisição cURL:

**Buscar Notícias:**
```bash
curl -i "https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/news/6571187291942?page=1&limit=5" \
  -H "Authorization: Bearer SUA_API_KEY"
```

**Buscar Imagens / Mídias:**
```bash
curl -i "https://ais-dev-4jv2t5wlv5nrqhdolstrpx-124157476255.us-west1.run.app/api/images/6571187291942?page=1&limit=5" \
  -H "Authorization: Bearer SUA_API_KEY"
```

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
