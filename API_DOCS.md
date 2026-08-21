# News Sources API - Documentação Completa

## Autenticação

Todos os endpoints da API são protegidos por API Key. A chave deve ser enviada em todas as requisições.

### API Key

A API Key é configurada via variável de ambiente/segredo `API_KEY`.

> **Produção:** no Cloudflare Workers, cadastre `API_KEY` como Secret ou nas variáveis do Worker. Em desenvolvimento, configure em `.env.local`.

### Formas de envio da API Key

A API aceita a chave de três formas diferentes (qualquer uma é válida):

1. **Header Authorization (Bearer Token):**
   ```http
   Authorization: Bearer <SUA_API_KEY>
   ```

2. **Header x-api-key:**
   ```http
   x-api-key: <SUA_API_KEY>
   ```

3. **Query parameter na URL:**
   ```
   ?api_key=<SUA_API_KEY>
   ```

---

## Base URL

```
/api
```

---

## Endpoints

### 1. Listar todas as fontes de notícias

```http
GET /api/sources
```

Lista todas as fontes de notícias agregadas, com suporte a paginação e filtros.

#### Parâmetros de Query

| Parâmetro  | Tipo    | Padrão | Descrição                                          |
|------------|---------|--------|----------------------------------------------------|
| `page`     | integer | 1      | Número da página                                   |
| `limit`    | integer | 20     | Itens por página (máx: 100)                        |
| `category` | string  | -      | Filtrar por categoria (case-insensitive)           |
| `type`     | string  | -      | Filtrar por tipo (`wp-api` ou `rss`)              |
| `active`   | boolean | -      | Filtrar por status ativo (`true` ou `false`)      |
| `stats`    | boolean | -      | Retornar apenas estatísticas (`stats=true`)        |

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/sources?page=1&limit=10"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "category": "Tocantins",
      "site": "exemplo.com.br",
      "type": "wp-api",
      "url": "https://exemplo.com.br/wp-json/wp/v2/posts",
      "active": true
    }
  ],
  "meta": {
    "total": 69,
    "page": 1,
    "limit": 10,
    "totalPages": 7
  }
}
```

---

### 2. Obter fonte de notícia por ID

```http
GET /api/sources/{id}
```

Retorna uma única fonte de notícia pelo seu identificador único.

#### Parâmetros de Path

| Parâmetro | Tipo   | Descrição    |
|-----------|--------|--------------|
| `id`      | string | ID da fonte  |

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/sources/1"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "1",
    "category": "Tocantins",
    "site": "exemplo.com.br",
    "type": "wp-api",
    "url": "https://exemplo.com.br/wp-json/wp/v2/posts",
    "active": true
  }
}
```

#### Resposta (404 Not Found)

```json
{
  "success": false,
  "error": "Source with id 'invalid-id' not found."
}
```

---

### 3. Listar fontes por categoria

```http
GET /api/sources/category/{category}
```

Retorna todas as fontes pertencentes a uma categoria específica.

#### Parâmetros de Path

| Parâmetro   | Tipo   | Descrição         |
|------------|--------|-------------------|
| `category` | string | Nome da categoria |

#### Parâmetros de Query

| Parâmetro | Tipo    | Padrão | Descrição                   |
|-----------|---------|--------|-----------------------------|
| `page`    | integer | 1      | Número da página            |
| `limit`   | integer | 20     | Itens por página (máx: 100) |

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/sources/category/Tocantins"
```

---

### 4. Listar todas as fontes de mídia (WordPress Media API)

```http
GET /api/media
```

Retorna a lista de todas as fontes com endpoints específicos de mídia do WordPress (`/wp-json/wp/v2/media`), permitindo consulta de anexos, imagens e arquivos multimídia das fontes.

#### Parâmetros de Query

| Parâmetro | Tipo    | Padrão | Descrição                                     |
|-----------|---------|--------|-----------------------------------------------|
| `active`  | boolean | -      | Filtrar por status ativo (`true` ou `false`) |

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/media?active=true"
```

#### Resposta (200 OK)

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
    },
    {
      "id": "2",
      "category": "Educação",
      "site": "exemplo-educacao.com.br",
      "type": "wp-api",
      "url": "https://exemplo-educacao.com.br/wp-json/wp/v2/media",
      "active": true
    }
  ],
  "meta": {
    "total": 27
  }
}
```

---

### 5. Obter fonte de mídia por ID

```http
GET /api/media/{id}
```

Retorna uma fonte de mídia específica pelo seu ID único.

#### Parâmetros de Path

| Parâmetro | Tipo   | Descrição               |
|-----------|--------|-------------------------|
| `id`      | string | Identificador da mídia  |

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/media/1"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "1",
    "category": "Tocantins",
    "site": "exemplo.com.br",
    "type": "wp-api",
    "url": "https://exemplo.com.br/wp-json/wp/v2/media",
    "active": true
  }
}
```

#### Resposta (404 Not Found)

```json
{
  "success": false,
  "error": "Media source not found"
}
```

---

### 6. Listar todas as categorias

```http
GET /api/categories
```

Retorna uma lista de todas as categorias cadastradas com a respectiva contagem de fontes.

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/categories"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": [
    { "category": "Economia", "count": 2 },
    { "category": "Educação", "count": 2 },
    { "category": "Esporte", "count": 2 },
    { "category": "Tocantins", "count": 10 }
  ],
  "meta": { "total": 30 }
}
```

---

### 7. Listar todos os tipos

```http
GET /api/types
```

Retorna a lista de formatos/protocolos de integração suportados (`wp-api`, `rss`) com a contagem de fontes.

---

### 8. Estatísticas da API

```http
GET /api/stats
```

Retorna métricas agregadas sobre o acervo de fontes de notícias e categorias.

---

### 9. Especificação OpenAPI

```http
GET /api/openapi.json
```

Retorna o documento de especificação OpenAPI 3.0.3 estruturado em JSON com todos os endpoints e schemas da API.

---

## Tratamento de Erros

### 401 Unauthorized
Retornado quando a API Key não foi informada ou é inválida.

```json
{
  "success": false,
  "error": "Unauthorized. Provide a valid API key via Authorization header (Bearer <key>), x-api-key header, or api_key query parameter."
}
```

### 404 Not Found
Retornado quando o recurso solicitado não foi encontrado.

```json
{
  "success": false,
  "error": "Source with id 'invalid-id' not found."
}
```

---

## Modelo de Dados (Schema)

### Source / MediaSource

| Campo      | Tipo    | Descrição                                          |
|------------|---------|----------------------------------------------------|
| `id`       | string  | Identificador único do registro                    |
| `category` | string  | Categoria editorial (ex: Tocantins, Educação)      |
| `site`     | string  | Nome de domínio ou portal de origem                |
| `type`     | string  | Tipo do protocolo de extração (`wp-api` ou `rss`)  |
| `url`      | string  | URL completa do endpoint da fonte de notícias/mídia |
| `active`   | boolean | Status de atividade do endpoint                    |

---

© 2026 News Sources API. Todos os direitos reservados.
