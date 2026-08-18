# News Sources API - Documentação

## Autenticação

Todos os endpoints da API são protegidos por API Key. A chave deve ser enviada em toda requisição.

### API Key

A API Key é fornecida exclusivamente por variável de ambiente/segredo `API_KEY` e não deve ser armazenada no repositório.

> **Produção:** no Cloudflare Workers, cadastre `API_KEY` como Secret. Em desenvolvimento, você pode usar `.env.local` ou `.dev.vars`.

### Formas de envio da API Key

A API aceita a chave de três formas diferentes (qualquer uma funciona):

1. **Header Authorization (Bearer Token):**
   ```
   Authorization: Bearer <SUA_API_KEY>
   ```

2. **Header x-api-key:**
   ```
   x-api-key: <SUA_API_KEY>
   ```

3. **Query parameter:**
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

### 1. Listar todas as fontes

```
GET /api/sources
```

Lista todas as fontes de notícias com suporte a paginação e filtros.

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
  "http://localhost:3000/api/sources?page=1&limit=10"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "clebertoledo-com-br",
      "category": "Tocantins",
      "site": "clebertoledo.com.br",
      "type": "wp-api",
      "url": "https://clebertoledo.com.br/wp-json/wp/v2/posts",
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

### 2. Obter fonte por ID

```
GET /api/sources/{id}
```

Retorna uma única fonte pelo seu ID único.

#### Parâmetros de Path

| Parâmetro | Tipo   | Descrição    |
|-----------|--------|--------------|
| `id`      | string | ID da fonte  |

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "http://localhost:3000/api/sources/clebertoledo-com-br"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clebertoledo-com-br",
    "category": "Tocantins",
    "site": "clebertoledo.com.br",
    "type": "wp-api",
    "url": "https://clebertoledo.com.br/wp-json/wp/v2/posts",
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

```
GET /api/sources/category/{category}
```

Retorna todas as fontes pertencentes a uma categoria específica (case-insensitive).

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
  "http://localhost:3000/api/sources/category/Tocantins"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "category": "Tocantins",
  "data": [...],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 4. Listar todas as categorias

```
GET /api/categories
```

Retorna uma lista de todas as categorias com a contagem de fontes em cada uma.

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "http://localhost:3000/api/categories"
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

### 5. Listar todos os tipos

```
GET /api/types
```

Retorna uma lista de todos os tipos de fonte (`wp-api`, `rss`) com a contagem de fontes em cada um.

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "http://localhost:3000/api/types"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": [
    { "type": "rss", "count": 44 },
    { "type": "wp-api", "count": 25 }
  ],
  "meta": { "total": 2 }
}
```

---

### 6. Estatísticas da API

```
GET /api/stats
```

Retorna estatísticas agregadas sobre o banco de fontes de notícias, incluindo contagens totais e breakdowns por categoria e tipo.

#### Exemplo de Requisição

```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "http://localhost:3000/api/stats"
```

#### Resposta (200 OK)

```json
{
  "success": true,
  "data": {
    "totalSources": 69,
    "totalCategories": 30,
    "totalTypes": 2,
    "activeSources": 69,
    "categories": [...],
    "types": [...]
  }
}
```

---

### 7. Especificação OpenAPI

```
GET /api/openapi.json
```

Retorna a especificação OpenAPI 3.0.3 completa da API em formato JSON. Este endpoint também requer autenticação.

---

## Erros

### 401 Unauthorized

Retornado quando a API Key está ausente ou é inválida.

```json
{
  "success": false,
  "error": "Unauthorized. Provide a valid API key via Authorization header (Bearer <key>), x-api-key header, or api_key query parameter."
}
```

### 404 Not Found

Retornado quando uma fonte ou categoria solicitada não existe.

```json
{
  "success": false,
  "error": "Source with id 'invalid-id' not found."
}
```

---

## Modelo de Dados

### Source

| Campo      | Tipo    | Descrição                                          |
|------------|---------|----------------------------------------------------|
| `id`       | string  | Identificador único da fonte                       |
| `category` | string  | Categoria da notícia (ex: Tocantins, Economia)     |
| `site`     | string  | Nome do site de origem                             |
| `type`     | string  | Tipo da fonte (`wp-api` ou `rss`)                 |
| `url`      | string  | URL do endpoint da fonte                           |
| `active`   | boolean | Status da fonte (ativa ou inativa)                 |
