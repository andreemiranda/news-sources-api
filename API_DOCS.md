# News Sources API - Documentação Técnica Completa

Guia de referência detalhado de todos os endpoints, autenticação, parâmetros de busca, paginação e modelos de resposta da **News Sources API**.

---

## 1. Autenticação e Segurança

Todos os endpoints da API são protegidos por API Key. A chave deve ser enviada em todas as requisições utilizando qualquer um dos 3 métodos suportados:

1. **Header Authorization (Bearer Token):**
   ```http
   Authorization: Bearer <SUA_API_KEY>
   ```

2. **Header x-api-key:**
   ```http
   x-api-key: <SUA_API_KEY>
   ```

3. **Query parameter na URL:**
   ```http
   GET /api/news?api_key=<SUA_API_KEY>
   ```

---

## 2. Endpoints Globais e de Agregação

### 2.1. Listar Todas as Fontes (`GET /api/news`)
Retorna a lista de todas as fontes cadastradas com paginação e suporte a filtros.

**Parâmetros de Query:**
- `page` (integer, padrão: `1`): Número da página.
- `limit` (integer, padrão: `20`, máx: `100`): Itens por página.
- `category` (string, opcional): Filtrar por categoria (ex: `Tocantins`, `Economia`).
- `type` (string, opcional): Filtrar por tipo (`wp-api` ou `rss`).
- `active` (boolean, opcional): Filtrar por status ativo (`true` ou `false`).
- `stats` (boolean, opcional): Retorna estatísticas de contagem de fontes.

### 2.2. Obter Metadados de Fonte por ID (`GET /api/news/{id}`)
Retorna a configuração e metadados de uma fonte de notícia pelo seu ID (`1` a `72`).

### 2.3. Obter Conteúdo em Tempo Real de Fonte (`GET /api/news/{id}`)
Consulta e extrai os artigos e notícias em tempo real diretamente do portal especificado pelo ID (`1` a `72`). Normaliza fontes WordPress REST API e RSS Feeds em um formato padronizado.

**Parâmetros de Query:**
- `page` (integer, padrão: `1`): Página de notícias.
- `limit` (integer, padrão: `10`, máx: `100`): Artigos por página.
- `search` (string, opcional): Termo para busca/filtro por palavra-chave.
- `raw` (boolean, opcional): Se `true`, inclui o objeto upstream original.

### 2.4. Listar Fontes por Categoria (`GET /api/news/category/{category}`)
Retorna todas as fontes associadas a uma categoria específica.

### 2.5. Listar Todos os Endpoints de Mídia (`GET /api/images`)
Retorna a lista dos 27 endpoints de mídia cadastrados (`/wp-json/wp/v2/media`).

### 2.6. Obter Metadados de Mídia por ID (`GET /api/images/{id}`)
Retorna os metadados de uma fonte de mídia pelo seu ID (`28` a `54`).

### 2.7. Obter Conteúdo de Mídia em Tempo Real (`GET /api/images/{id}`)
Consulta o endpoint WordPress de mídia do portal em tempo real e retorna imagens, fotos, PDFs e metadados de upload pelo ID (`28` a `54`).

### 2.8. Categorias (`GET /api/categories`)
Retorna todas as categorias com suas contagens.

### 2.9. Tipos de Integração (`GET /api/types`)
Retorna os tipos de integração (`wp-api`, `rss`) com suas contagens.

### 2.10. Estatísticas da API (`GET /api/stats`)
Retorna totais de fontes, fontes ativas, inativas, total de categorias e tipos.

### 2.11. Especificação OpenAPI (`GET /api/openapi.json`)
Retorna a especificação OpenAPI 3.0.3 completa em formato JSON.

---

## 3. Tabela Completa: Todos os 72 Endpoints de Fontes de Notícias

A tabela abaixo lista nominalmente cada uma das 72 fontes de notícias cadastradas, seu portal de origem, categoria, tipo e as URLs diretas de endpoint para metadados e conteúdo em tempo real:

| ID | Categoria | Portal / Site | Tipo | Endpoint de Metadados | Endpoint de Conteúdo em Tempo Real |
|---|---|---|---|---|---|
| `1` | Tocantins | clebertoledo.com.br | `wp-api` | `GET /api/news/1` | `GET /api/news/1` |
| `2` | Educação | infoeducacao.com.br | `wp-api` | `GET /api/news/2` | `GET /api/news/2/content` |
| `3` | Justiça | nacaojuridica.com.br | `wp-api` | `GET /api/news/3` | `GET /api/news/3/content` |
| `4` | Tocantins | atitudeto.com.br | `wp-api` | `GET /api/news/4` | `GET /api/news/4/content` |
| `5` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET /api/news/5` | `GET /api/news/5/content` |
| `6` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET /api/news/6` | `GET /api/news/6/content` |
| `7` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET /api/news/7` | `GET /api/news/7/content` |
| `8` | Economia | minhaseconomias.com.br | `wp-api` | `GET /api/news/8` | `GET /api/news/8/content` |
| `9` | Esporte | gazetaesportiva.com | `wp-api` | `GET /api/news/9` | `GET /api/news/9/content` |
| `10` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET /api/news/10` | `GET /api/news/10/content` |
| `11` | Finanças | classic.exame.com | `wp-api` | `GET /api/news/11` | `GET /api/news/11/content` |
| `12` | Palmeiras | palmeiras.com.br | `wp-api` | `GET /api/news/12` | `GET /api/news/12/content` |
| `13` | Goiás | opiniaogoias.com.br | `wp-api` | `GET /api/news/13` | `GET /api/news/13/content` |
| `14` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET /api/news/14` | `GET /api/news/14/content` |
| `15` | Goiás | diariodegoias.com.br | `wp-api` | `GET /api/news/15` | `GET /api/news/15/content` |
| `16` | Justiça | conjur.com.br | `wp-api` | `GET /api/news/16` | `GET /api/news/16/content` |
| `17` | Justiça | meusitejuridico.editorajuspodivm.com.br | `wp-api` | `GET /api/news/17` | `GET /api/news/17/content` |
| `18` | Justiça | inw.org.br | `wp-api` | `GET /api/news/18` | `GET /api/news/18/content` |
| `19` | Santa Catarina | santacatarinaempauta.com.br | `wp-api` | `GET /api/news/19` | `GET /api/news/19/content` |
| `20` | Tocantins | vozdobico.com.br | `wp-api` | `GET /api/news/20` | `GET /api/news/20/content` |
| `21` | Tocantins | portaldobico.com.br | `wp-api` | `GET /api/news/21` | `GET /api/news/21/content` |
| `22` | Tocantins | folhadobico.com.br | `wp-api` | `GET /api/news/22` | `GET /api/news/22/content` |
| `23` | Tocantins | bico24horas.com.br | `wp-api` | `GET /api/news/23` | `GET /api/news/23/content` |
| `24` | Tocantins | guaraiense.com.br | `wp-api` | `GET /api/news/24` | `GET /api/news/24/content` |
| `25` | Tocantins | jornalobico.com.br | `wp-api` | `GET /api/news/25` | `GET /api/news/25/content` |
| `26` | Esporte | ludopedio.org.br | `wp-api` | `GET /api/news/26` | `GET /api/news/26/content` |
| `27` | Notícias Gerais | folhadestra.com | `wp-api` | `GET /api/news/27` | `GET /api/news/27/content` |
| `28` | Notícias Gerais | g1.globo.com | `rss` | `GET /api/news/28` | `GET /api/news/28/content` |
| `29` | Santa Catarina | g1.globo.com | `rss` | `GET /api/news/29` | `GET /api/news/29/content` |
| `30` | Tocantins | g1.globo.com | `rss` | `GET /api/news/30` | `GET /api/news/30/content` |
| `31` | Sergipe | g1.globo.com | `rss` | `GET /api/news/31` | `GET /api/news/31/content` |
| `32` | Vale do Paraíba e região | g1.globo.com | `rss` | `GET /api/news/32` | `GET /api/news/32/content` |
| `33` | São Carlos e Araraquara | g1.globo.com | `rss` | `GET /api/news/33` | `GET /api/news/33/content` |
| `34` | Santos e Região | g1.globo.com | `rss` | `GET /api/news/34` | `GET /api/news/34/content` |
| `35` | Ribeirão Preto e Franca | g1.globo.com | `rss` | `GET /api/news/35` | `GET /api/news/35/content` |
| `36` | Mogi das Cruzes e Suzano | g1.globo.com | `rss` | `GET /api/news/36` | `GET /api/news/36/content` |
| `37` | Campinas e região | g1.globo.com | `rss` | `GET /api/news/37` | `GET /api/news/37/content` |
| `38` | Bauru e Marília | g1.globo.com | `rss` | `GET /api/news/38` | `GET /api/news/38/content` |
| `39` | Roraima | g1.globo.com | `rss` | `GET /api/news/39` | `GET /api/news/39/content` |
| `40` | Rondônia | g1.globo.com | `rss` | `GET /api/news/40` | `GET /api/news/40/content` |
| `41` | Rio Grande do Sul | g1.globo.com | `rss` | `GET /api/news/41` | `GET /api/news/41/content` |
| `42` | Rio Grande do Norte | g1.globo.com | `rss` | `GET /api/news/42` | `GET /api/news/42/content` |
| `43` | Sul e Costa Verde Fluminense | g1.globo.com | `rss` | `GET /api/news/43` | `GET /api/news/43/content` |
| `44` | Norte Fluminense | g1.globo.com | `rss` | `GET /api/news/44` | `GET /api/news/44/content` |
| `45` | Região dos Lagos Fluminense | g1.globo.com | `rss` | `GET /api/news/45` | `GET /api/news/45/content` |
| `46` | Região Serrana Fluminense | g1.globo.com | `rss` | `GET /api/news/46` | `GET /api/news/46/content` |
| `47` | Petrolina e Região | g1.globo.com | `rss` | `GET /api/news/47` | `GET /api/news/47/content` |
| `48` | Caruaru e Região | g1.globo.com | `rss` | `GET /api/news/48` | `GET /api/news/48/content` |
| `49` | Norte e Noroeste do Paraná | g1.globo.com | `rss` | `GET /api/news/49` | `GET /api/news/49/content` |
| `50` | Oeste e Sudoeste do Paraná | g1.globo.com | `rss` | `GET /api/news/50` | `GET /api/news/50/content` |
| `51` | Campos Gerais e Sul do Paraná | g1.globo.com | `rss` | `GET /api/news/51` | `GET /api/news/51/content` |
| `52` | Paraná | g1.globo.com | `rss` | `GET /api/news/52` | `GET /api/news/52/content` |
| `53` | Paraíba | g1.globo.com | `rss` | `GET /api/news/53` | `GET /api/news/53/content` |
| `54` | Pará | g1.globo.com | `rss` | `GET /api/news/54` | `GET /api/news/54/content` |
| `55` | Zona da Mata Mineira | g1.globo.com | `rss` | `GET /api/news/55` | `GET /api/news/55/content` |
| `56` | Vales de Minas Gerais | g1.globo.com | `rss` | `GET /api/news/56` | `GET /api/news/56/content` |
| `57` | Sul de Minas | g1.globo.com | `rss` | `GET /api/news/57` | `GET /api/news/57/content` |
| `58` | Grande Minas | g1.globo.com | `rss` | `GET /api/news/58` | `GET /api/news/58/content` |
| `59` | Centro-Oeste de Minas | g1.globo.com | `rss` | `GET /api/news/59` | `GET /api/news/59/content` |
| `60` | Maranhão | g1.globo.com | `rss` | `GET /api/news/60` | `GET /api/news/60/content` |
| `61` | Amazonas | g1.globo.com | `rss` | `GET /api/news/61` | `GET /api/news/61/content` |
| `62` | Amapá | g1.globo.com | `rss` | `GET /api/news/62` | `GET /api/news/62/content` |
| `63` | Alagoas | g1.globo.com | `rss` | `GET /api/news/63` | `GET /api/news/63/content` |
| `64` | Acre | g1.globo.com | `rss` | `GET /api/news/64` | `GET /api/news/64/content` |
| `65` | Turismo e Viagem | g1.globo.com | `rss` | `GET /api/news/65` | `GET /api/news/65/content` |
| `66` | Tecnologia e Games | g1.globo.com | `rss` | `GET /api/news/66` | `GET /api/news/66/content` |
| `67` | Pop & Arte | g1.globo.com | `rss` | `GET /api/news/67` | `GET /api/news/67/content` |
| `68` | Mundo | g1.globo.com | `rss` | `GET /api/news/68` | `GET /api/news/68/content` |
| `69` | Loterias | g1.globo.com | `rss` | `GET /api/news/69` | `GET /api/news/69/content` |
| `70` | Educação | g1.globo.com | `rss` | `GET /api/news/70` | `GET /api/news/70/content` |
| `71` | Economia | g1.globo.com | `rss` | `GET /api/news/71` | `GET /api/news/71/content` |
| `72` | Autoesporte | g1.globo.com | `rss` | `GET /api/news/72` | `GET /api/news/72/content` |

---

## 4. Tabela Completa: Todos os 27 Endpoints de Mídia

A tabela abaixo lista nominalmente cada um dos 27 endpoints de mídia cadastrados, seu portal de origem, categoria, tipo e as URLs diretas de endpoint para metadados e conteúdo multimídia em tempo real:

| ID | Categoria | Portal / Site | Tipo | Endpoint de Metadados | Endpoint de Conteúdo de Mídia em Tempo Real |
|---|---|---|---|---|---|
| `28` | Tocantins | clebertoledo.com.br | `wp-api` | `GET /api/images/28` | `GET /api/images/28` |
| `29` | Educação | infoeducacao.com.br | `wp-api` | `GET /api/images/29` | `GET /api/images/29/content` |
| `30` | Justiça | nacaojuridica.com.br | `wp-api` | `GET /api/images/30` | `GET /api/images/30/content` |
| `31` | Tocantins | atitudeto.com.br | `wp-api` | `GET /api/images/31` | `GET /api/images/31/content` |
| `32` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET /api/images/32` | `GET /api/images/32/content` |
| `33` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET /api/images/33` | `GET /api/images/33/content` |
| `34` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET /api/images/34` | `GET /api/images/34/content` |
| `35` | Economia | minhaseconomias.com.br | `wp-api` | `GET /api/images/35` | `GET /api/images/35/content` |
| `36` | Esporte | gazetaesportiva.com | `wp-api` | `GET /api/images/36` | `GET /api/images/36/content` |
| `37` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET /api/images/37` | `GET /api/images/37/content` |
| `38` | Finanças | classic.exame.com | `wp-api` | `GET /api/images/38` | `GET /api/images/38/content` |
| `39` | Palmeiras | palmeiras.com.br | `wp-api` | `GET /api/images/39` | `GET /api/images/39/content` |
| `40r` | Goiás | opiniaogoias.com.br | `wp-api` | `GET /api/images/40r` | `GET /api/images/40r/content` |
| `41` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET /api/images/41` | `GET /api/images/41/content` |
| `42` | Goiás | diariodegoias.com.br | `wp-api` | `GET /api/images/42` | `GET /api/images/42/content` |
| `43` | Justiça | conjur.com.br | `wp-api` | `GET /api/images/43` | `GET /api/images/43/content` |
| `44` | Justiça | meusitejuridico.editorajuspodivm.com.br | `wp-api` | `GET /api/images/44` | `GET /api/images/44/content` |
| `45` | Justiça | inw.org.br | `wp-api` | `GET /api/images/45` | `GET /api/images/45/content` |
| `46` | Santa Catarina | santacatarinaempauta.com.br | `wp-api` | `GET /api/images/46` | `GET /api/images/46/content` |
| `47` | Tocantins | vozdobico.com.br | `wp-api` | `GET /api/images/47` | `GET /api/images/47/content` |
| `48` | Tocantins | portaldobico.com.br | `wp-api` | `GET /api/images/48` | `GET /api/images/48/content` |
| `49` | Tocantins | folhadobico.com.br | `wp-api` | `GET /api/images/49` | `GET /api/images/49/content` |
| `50` | Tocantins | bico24horas.com.br | `wp-api` | `GET /api/images/50` | `GET /api/images/50/content` |
| `51` | Tocantins | guaraiense.com.br | `wp-api` | `GET /api/images/51` | `GET /api/images/51/content` |
| `52` | Tocantins | jornalobico.com.br | `wp-api` | `GET /api/images/52` | `GET /api/images/52/content` |
| `53` | Esporte | ludopedio.org.br | `wp-api` | `GET /api/images/53` | `GET /api/images/53/content` |
| `54` | Notícias Gerais | folhadestra.com | `wp-api` | `GET /api/images/54` | `GET /api/images/54/content` |

---

## 5. Exemplos Práticos de Requisição e Resposta

### 5.1. Exemplo: Notícias em Tempo Real de uma Fonte (`GET /api/news/1`)

**Requisição cURL:**
```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/news/1?page=1&limit=2"
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "source": {
      "id": "1",
      "category": "Tocantins",
      "site": "exemplo.com.br",
      "type": "wp-api",
      "url": "https://exemplo.com.br/wp-json/wp/v2/posts",
      "active": true
    },
    "pagination": {
      "total": 45000,
      "page": 1,
      "limit": 2,
      "totalPages": 22500
    },
    "items": [
      {
        "id": 319687,
        "title": "Avanço nos investimentos e novas iniciativas no estado",
        "link": "https://exemplo.com.br/noticia-exemplo-1",
        "description": "Resumo da matéria jornalística com os principais pontos destacados...",
        "content": "<p>Conteúdo integral e formatado da publicação...</p>",
        "pubDate": "2026-08-21T09:30:00",
        "author": "Redação",
        "imageUrl": "https://exemplo.com.br/wp-content/uploads/imagem-destaque.jpg"
      }
    ]
  }
}
```

---

### 5.2. Exemplo: Mídia em Tempo Real de um Portal (`GET /api/images/28`)

**Requisição cURL:**
```bash
curl -H "x-api-key: <SUA_API_KEY>" \
  "https://seu-dominio.workers.dev/api/images/28?page=1&limit=2"
```

**Resposta (200 OK):**
```json
{
  "success": true,
  "data": {
    "source": {
      "id": "28",
      "category": "Tocantins",
      "site": "exemplo.com.br",
      "type": "wp-api",
      "url": "https://exemplo.com.br/wp-json/wp/v2/media",
      "active": true
    },
    "pagination": {
      "total": 55000,
      "page": 1,
      "limit": 2,
      "totalPages": 27500
    },
    "items": [
      {
        "id": 319688,
        "title": "foto-destaque-evento",
        "link": "https://exemplo.com.br/foto-destaque-evento/",
        "pubDate": "2026-08-21T08:15:00",
        "imageUrl": "https://exemplo.com.br/wp-content/uploads/foto-evento.jpg",
        "mediaUrl": "https://exemplo.com.br/wp-content/uploads/foto-evento.jpg",
        "raw": {
          "mime_type": "image/jpeg",
          "media_type": "image"
        }
      }
    ]
  }
}
```

---

## 6. Códigos de Status HTTP

| Código | Significado | Descrição |
|---|---|---|
| `200 OK` | Sucesso | Requisição processada com êxito e dados retornados |
| `401 Unauthorized` | Não Autorizado | Chave de API ausente, inválida ou não autorizada |
| `404 Not Found` | Não Encontrado | O ID da fonte ou categoria especificada não existe |
| `502 Bad Gateway` | Erro Upstream | Falha temporária ao comunicar com o servidor da fonte externa |

---

© 2026 News Sources API. Todos os direitos reservados.
