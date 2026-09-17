# News & Media Sources API

API REST para acesso centralizado a fontes de notícias brasileiras, conteúdos em tempo real (posts, matérias jornalísticas e artigos) e uploads de mídia (imagens, anexos e fotos), padronizando saídas de REST APIs WordPress (`wp-api`) e feeds XML (`rss`).

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

- **Swagger UI**: Disponível na página inicial (`https://example.com/`).
- **RapiDoc**: Disponível na rota dedicada (`https://example.com/docs`).
- **Especificação OpenAPI 3.0.3 (JSON)**: `https://example.com/api/openapi.json`.

---

## Endpoints da API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `https://example.com/api/news` | Lista de fontes de notícias cadastradas (filtros: `category`, `type`, `active`) |
| GET | `https://example.com/api/news/{id}` | Notícias em tempo real da fonte `{id}` |
| GET | `https://example.com/api/news/category/{category}` | Fontes filtradas por categoria |
| GET | `https://example.com/api/images` | Lista de fontes com suporte a mídia e uploads |
| GET | `https://example.com/api/images/{id}` | Mídias e imagens em tempo real da fonte `{id}` |
| GET | `https://example.com/api/categories` | Categorias disponíveis com total de fontes |
| GET | `https://example.com/api/types` | Tipos suportados (`wp-api`, `rss`) com totais |
| GET | `https://example.com/api/stats` | Estatísticas gerais da API |
| GET | `https://example.com/api/health` | Verificação de integridade e uptime (Público, sem auth) |

---

## Paginação Padrão WordPress

Os endpoints de conteúdo retornam uma lista JSON direta com metadados nos cabeçalhos HTTP:
- `X-WP-Total`: Total de registros disponíveis no servidor de origem.
- `X-WP-TotalPages`: Total de páginas disponíveis.

### Exemplos de Requisição:

**Buscar Notícias:**
```bash
curl -i "https://example.com/api/news/383841537673882?page=1&limit=5" \
  -H "Authorization: Bearer SUA_API_KEY"
```

**Buscar Imagens / Mídias:**
```bash
curl -i "https://example.com/api/images/383841537673882?page=1&limit=5" \
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
