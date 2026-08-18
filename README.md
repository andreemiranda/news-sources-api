# News Sources API

API REST para acesso a fontes de notícias brasileiras agregadas de diversos portais. Todos os endpoints são protegidos por API Key.

## Documentação

- A documentação interativa (Swagger UI) está disponível na página inicial do app.
- A documentação completa em texto está no arquivo `API_DOCS.md` no repositório.

## Autenticação

Todos os endpoints exigem uma API Key, que pode ser enviada de três formas:

1. Header `Authorization: Bearer <sua-chave>`
2. Header `x-api-key: <sua-chave>`
3. Query parameter `?api_key=<sua-chave>`

A chave está disponível no repositório (arquivo `API_DOCS.md`). Em produção, defina a variável de ambiente `API_KEY` para substituir a chave padrão.

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/sources` | Lista paginada de fontes (filtros: category, type, active, stats) |
| GET | `/api/sources/{id}` | Fonte específica por ID |
| GET | `/api/sources/category/{category}` | Fontes filtradas por categoria |
| GET | `/api/categories` | Lista de categorias com contagem |
| GET | `/api/types` | Lista de tipos com contagem |
| GET | `/api/stats` | Estatísticas gerais da API |
| GET | `/api/openapi.json` | Especificação OpenAPI 3.0.3 |

## Desenvolvimento

```bash
npm install
npm run dev    # ambiente de desenvolvimento
npm run build  # build de produção
npm start      # servidor de produção
```

## Produção

- Defina a variável de ambiente `API_KEY` com uma chave segura.
- O app está configurado com `reactStrictMode`, compressão e sem header `X-Powered-By`.
