# News Sources API

API REST para acesso a fontes de notícias, endpoints de mídia e conteúdos em tempo real (posts, artigos, imagens e uploads) de portais brasileiros. Todos os endpoints são protegidos por API Key.

## Documentação Interativa

- **Swagger UI**: Disponível na página inicial (`/`).
- **RapiDoc**: Disponível na rota de documentação (`/docs`).
- **Especificação OpenAPI 3.0.3**: `/api/openapi.json`.

## Autenticação

Todos os endpoints exigem envio da API Key em um dos seguintes formatos:

1. Header `Authorization: Bearer <sua-chave>`
2. Header `x-api-key: <sua-chave>`
3. Query parameter `?api_key=<sua-chave>`

> **Configuração em Produção:** No Cloudflare Workers ou servidor, cadastre o segredo ou variável de ambiente `API_KEY`.

---

## Sumário de Endpoints Globais

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/sources` | Lista paginada das 72 fontes de notícias (filtros: `category`, `type`, `active`, `stats`) |
| GET | `/api/sources/{id}` | Metadados da fonte de notícia por ID (`1` a `72`) |
| GET | `/api/sources/{id}/content` | **Conteúdo em tempo real** da fonte {id} (`1` a `72`) — posts, artigos, autores, imagens (WordPress e RSS) |
| GET | `/api/sources/category/{category}` | Lista de fontes filtradas por categoria |
| GET | `/api/media` | Lista completa dos 27 endpoints de mídia WordPress (`/wp-json/wp/v2/media`) |
| GET | `/api/media/{id}` | Metadados do endpoint de mídia por ID (`28` a `54`) |
| GET | `/api/media/{id}/content` | **Conteúdo de mídia em tempo real** do endpoint {id} (`28` a `54`) — imagens, fotos, anexos e PDFs |
| GET | `/api/categories` | Lista de categorias com contagem de fontes |
| GET | `/api/types` | Lista de tipos de integração (`wp-api`, `rss`) com contagem de fontes |
| GET | `/api/stats` | Estatísticas gerais da API |
| GET | `/api/openapi.json` | Especificação OpenAPI 3.0.3 (JSON) |

---

## Lista Completa: 72 Endpoints de Notícias e Conteúdo em Tempo Real

Abaixo estão listados todos os 72 portais cadastrados com seus respectivos endpoints diretos para consulta de metadados e para extração do conteúdo em tempo real:

| ID | Categoria | Portal / Site | Tipo | Endpoint Metadados | Endpoint Conteúdo em Tempo Real |
|---|---|---|---|---|---|
| `1` | Tocantins | clebertoledo.com.br | `wp-api` | `GET /api/sources/1` | `GET /api/sources/1/content` |
| `2` | Educação | infoeducacao.com.br | `wp-api` | `GET /api/sources/2` | `GET /api/sources/2/content` |
| `3` | Justiça | nacaojuridica.com.br | `wp-api` | `GET /api/sources/3` | `GET /api/sources/3/content` |
| `4` | Tocantins | atitudeto.com.br | `wp-api` | `GET /api/sources/4` | `GET /api/sources/4/content` |
| `5` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET /api/sources/5` | `GET /api/sources/5/content` |
| `6` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET /api/sources/6` | `GET /api/sources/6/content` |
| `7` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET /api/sources/7` | `GET /api/sources/7/content` |
| `8` | Economia | minhaseconomias.com.br | `wp-api` | `GET /api/sources/8` | `GET /api/sources/8/content` |
| `9` | Esporte | gazetaesportiva.com | `wp-api` | `GET /api/sources/9` | `GET /api/sources/9/content` |
| `10` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET /api/sources/10` | `GET /api/sources/10/content` |
| `11` | Finanças | classic.exame.com | `wp-api` | `GET /api/sources/11` | `GET /api/sources/11/content` |
| `12` | Palmeiras | palmeiras.com.br | `wp-api` | `GET /api/sources/12` | `GET /api/sources/12/content` |
| `13` | Goiás | opiniaogoias.com.br | `wp-api` | `GET /api/sources/13` | `GET /api/sources/13/content` |
| `14` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET /api/sources/14` | `GET /api/sources/14/content` |
| `15` | Goiás | diariodegoias.com.br | `wp-api` | `GET /api/sources/15` | `GET /api/sources/15/content` |
| `16` | Justiça | conjur.com.br | `wp-api` | `GET /api/sources/16` | `GET /api/sources/16/content` |
| `17` | Justiça | meusitejuridico.editorajuspodivm.com.br | `wp-api` | `GET /api/sources/17` | `GET /api/sources/17/content` |
| `18` | Justiça | inw.org.br | `wp-api` | `GET /api/sources/18` | `GET /api/sources/18/content` |
| `19` | Santa Catarina | santacatarinaempauta.com.br | `wp-api` | `GET /api/sources/19` | `GET /api/sources/19/content` |
| `20` | Tocantins | vozdobico.com.br | `wp-api` | `GET /api/sources/20` | `GET /api/sources/20/content` |
| `21` | Tocantins | portaldobico.com.br | `wp-api` | `GET /api/sources/21` | `GET /api/sources/21/content` |
| `22` | Tocantins | folhadobico.com.br | `wp-api` | `GET /api/sources/22` | `GET /api/sources/22/content` |
| `23` | Tocantins | bico24horas.com.br | `wp-api` | `GET /api/sources/23` | `GET /api/sources/23/content` |
| `24` | Tocantins | guaraiense.com.br | `wp-api` | `GET /api/sources/24` | `GET /api/sources/24/content` |
| `25` | Tocantins | jornalobico.com.br | `wp-api` | `GET /api/sources/25` | `GET /api/sources/25/content` |
| `26` | Esporte | ludopedio.org.br | `wp-api` | `GET /api/sources/26` | `GET /api/sources/26/content` |
| `27` | Notícias Gerais | folhadestra.com | `wp-api` | `GET /api/sources/27` | `GET /api/sources/27/content` |
| `28` | Notícias Gerais | g1.globo.com | `rss` | `GET /api/sources/28` | `GET /api/sources/28/content` |
| `29` | Santa Catarina | g1.globo.com | `rss` | `GET /api/sources/29` | `GET /api/sources/29/content` |
| `30` | Tocantins | g1.globo.com | `rss` | `GET /api/sources/30` | `GET /api/sources/30/content` |
| `31` | Sergipe | g1.globo.com | `rss` | `GET /api/sources/31` | `GET /api/sources/31/content` |
| `32` | Vale do Paraíba e região | g1.globo.com | `rss` | `GET /api/sources/32` | `GET /api/sources/32/content` |
| `33` | São Carlos e Araraquara | g1.globo.com | `rss` | `GET /api/sources/33` | `GET /api/sources/33/content` |
| `34` | Santos e Região | g1.globo.com | `rss` | `GET /api/sources/34` | `GET /api/sources/34/content` |
| `35` | Ribeirão Preto e Franca | g1.globo.com | `rss` | `GET /api/sources/35` | `GET /api/sources/35/content` |
| `36` | Mogi das Cruzes e Suzano | g1.globo.com | `rss` | `GET /api/sources/36` | `GET /api/sources/36/content` |
| `37` | Campinas e região | g1.globo.com | `rss` | `GET /api/sources/37` | `GET /api/sources/37/content` |
| `38` | Bauru e Marília | g1.globo.com | `rss` | `GET /api/sources/38` | `GET /api/sources/38/content` |
| `39` | Roraima | g1.globo.com | `rss` | `GET /api/sources/39` | `GET /api/sources/39/content` |
| `40` | Rondônia | g1.globo.com | `rss` | `GET /api/sources/40` | `GET /api/sources/40/content` |
| `41` | Rio Grande do Sul | g1.globo.com | `rss` | `GET /api/sources/41` | `GET /api/sources/41/content` |
| `42` | Rio Grande do Norte | g1.globo.com | `rss` | `GET /api/sources/42` | `GET /api/sources/42/content` |
| `43` | Sul e Costa Verde Fluminense | g1.globo.com | `rss` | `GET /api/sources/43` | `GET /api/sources/43/content` |
| `44` | Norte Fluminense | g1.globo.com | `rss` | `GET /api/sources/44` | `GET /api/sources/44/content` |
| `45` | Região dos Lagos Fluminense | g1.globo.com | `rss` | `GET /api/sources/45` | `GET /api/sources/45/content` |
| `46` | Região Serrana Fluminense | g1.globo.com | `rss` | `GET /api/sources/46` | `GET /api/sources/46/content` |
| `47` | Petrolina e Região | g1.globo.com | `rss` | `GET /api/sources/47` | `GET /api/sources/47/content` |
| `48` | Caruaru e Região | g1.globo.com | `rss` | `GET /api/sources/48` | `GET /api/sources/48/content` |
| `49` | Norte e Noroeste do Paraná | g1.globo.com | `rss` | `GET /api/sources/49` | `GET /api/sources/49/content` |
| `50` | Oeste e Sudoeste do Paraná | g1.globo.com | `rss` | `GET /api/sources/50` | `GET /api/sources/50/content` |
| `51` | Campos Gerais e Sul do Paraná | g1.globo.com | `rss` | `GET /api/sources/51` | `GET /api/sources/51/content` |
| `52` | Paraná | g1.globo.com | `rss` | `GET /api/sources/52` | `GET /api/sources/52/content` |
| `53` | Paraíba | g1.globo.com | `rss` | `GET /api/sources/53` | `GET /api/sources/53/content` |
| `54` | Pará | g1.globo.com | `rss` | `GET /api/sources/54` | `GET /api/sources/54/content` |
| `55` | Zona da Mata Mineira | g1.globo.com | `rss` | `GET /api/sources/55` | `GET /api/sources/55/content` |
| `56` | Vales de Minas Gerais | g1.globo.com | `rss` | `GET /api/sources/56` | `GET /api/sources/56/content` |
| `57` | Sul de Minas | g1.globo.com | `rss` | `GET /api/sources/57` | `GET /api/sources/57/content` |
| `58` | Grande Minas | g1.globo.com | `rss` | `GET /api/sources/58` | `GET /api/sources/58/content` |
| `59` | Centro-Oeste de Minas | g1.globo.com | `rss` | `GET /api/sources/59` | `GET /api/sources/59/content` |
| `60` | Maranhão | g1.globo.com | `rss` | `GET /api/sources/60` | `GET /api/sources/60/content` |
| `61` | Amazonas | g1.globo.com | `rss` | `GET /api/sources/61` | `GET /api/sources/61/content` |
| `62` | Amapá | g1.globo.com | `rss` | `GET /api/sources/62` | `GET /api/sources/62/content` |
| `63` | Alagoas | g1.globo.com | `rss` | `GET /api/sources/63` | `GET /api/sources/63/content` |
| `64` | Acre | g1.globo.com | `rss` | `GET /api/sources/64` | `GET /api/sources/64/content` |
| `65` | Turismo e Viagem | g1.globo.com | `rss` | `GET /api/sources/65` | `GET /api/sources/65/content` |
| `66` | Tecnologia e Games | g1.globo.com | `rss` | `GET /api/sources/66` | `GET /api/sources/66/content` |
| `67` | Pop & Arte | g1.globo.com | `rss` | `GET /api/sources/67` | `GET /api/sources/67/content` |
| `68` | Mundo | g1.globo.com | `rss` | `GET /api/sources/68` | `GET /api/sources/68/content` |
| `69` | Loterias | g1.globo.com | `rss` | `GET /api/sources/69` | `GET /api/sources/69/content` |
| `70` | Educação | g1.globo.com | `rss` | `GET /api/sources/70` | `GET /api/sources/70/content` |
| `71` | Economia | g1.globo.com | `rss` | `GET /api/sources/71` | `GET /api/sources/71/content` |
| `72` | Autoesporte | g1.globo.com | `rss` | `GET /api/sources/72` | `GET /api/sources/72/content` |

---

## Lista Completa: 27 Endpoints de Mídia e Conteúdo em Tempo Real

Abaixo estão listados todos os 27 endpoints de mídia cadastrados com seus respectivos endpoints diretos para consulta de metadados e arquivos de mídia em tempo real:

| ID | Categoria | Portal / Site | Tipo | Endpoint Metadados | Endpoint Conteúdo de Mídia em Tempo Real |
|---|---|---|---|---|---|
| `28` | Tocantins | clebertoledo.com.br | `wp-api` | `GET /api/media/28` | `GET /api/media/28/content` |
| `29` | Educação | infoeducacao.com.br | `wp-api` | `GET /api/media/29` | `GET /api/media/29/content` |
| `30` | Justiça | nacaojuridica.com.br | `wp-api` | `GET /api/media/30` | `GET /api/media/30/content` |
| `31` | Tocantins | atitudeto.com.br | `wp-api` | `GET /api/media/31` | `GET /api/media/31/content` |
| `32` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET /api/media/32` | `GET /api/media/32/content` |
| `33` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET /api/media/33` | `GET /api/media/33/content` |
| `34` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET /api/media/34` | `GET /api/media/34/content` |
| `35` | Economia | minhaseconomias.com.br | `wp-api` | `GET /api/media/35` | `GET /api/media/35/content` |
| `36` | Esporte | gazetaesportiva.com | `wp-api` | `GET /api/media/36` | `GET /api/media/36/content` |
| `37` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET /api/media/37` | `GET /api/media/37/content` |
| `38` | Finanças | classic.exame.com | `wp-api` | `GET /api/media/38` | `GET /api/media/38/content` |
| `39` | Palmeiras | palmeiras.com.br | `wp-api` | `GET /api/media/39` | `GET /api/media/39/content` |
| `40r` | Goiás | opiniaogoias.com.br | `wp-api` | `GET /api/media/40r` | `GET /api/media/40r/content` |
| `41` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET /api/media/41` | `GET /api/media/41/content` |
| `42` | Goiás | diariodegoias.com.br | `wp-api` | `GET /api/media/42` | `GET /api/media/42/content` |
| `43` | Justiça | conjur.com.br | `wp-api` | `GET /api/media/43` | `GET /api/media/43/content` |
| `44` | Justiça | meusitejuridico.editorajuspodivm.com.br | `wp-api` | `GET /api/media/44` | `GET /api/media/44/content` |
| `45` | Justiça | inw.org.br | `wp-api` | `GET /api/media/45` | `GET /api/media/45/content` |
| `46` | Santa Catarina | santacatarinaempauta.com.br | `wp-api` | `GET /api/media/46` | `GET /api/media/46/content` |
| `47` | Tocantins | vozdobico.com.br | `wp-api` | `GET /api/media/47` | `GET /api/media/47/content` |
| `48` | Tocantins | portaldobico.com.br | `wp-api` | `GET /api/media/48` | `GET /api/media/48/content` |
| `49` | Tocantins | folhadobico.com.br | `wp-api` | `GET /api/media/49` | `GET /api/media/49/content` |
| `50` | Tocantins | bico24horas.com.br | `wp-api` | `GET /api/media/50` | `GET /api/media/50/content` |
| `51` | Tocantins | guaraiense.com.br | `wp-api` | `GET /api/media/51` | `GET /api/media/51/content` |
| `52` | Tocantins | jornalobico.com.br | `wp-api` | `GET /api/media/52` | `GET /api/media/52/content` |
| `53` | Esporte | ludopedio.org.br | `wp-api` | `GET /api/media/53` | `GET /api/media/53/content` |
| `54` | Notícias Gerais | folhadestra.com | `wp-api` | `GET /api/media/54` | `GET /api/media/54/content` |

---

## Como Usar os Endpoints de Conteúdo em Tempo Real

### 1. Consultar Notícias de uma Fonte Específica (`/api/sources/{id}/content`)

Retorna as matérias e publicações atualizadas diretamente do portal (WordPress REST API ou RSS Feed XML).

```bash
# Exemplo: Obter as últimas 5 notícias da fonte 1 (clebertoledo.com.br)
curl -H "x-api-key: <SUA_API_KEY>" "https://seu-dominio.workers.dev/api/sources/1/content?limit=5"
```

**Parâmetros de Query Suportados:**
- `page` (integer, padrão: `1`): Número da página.
- `limit` ou `per_page` (integer, padrão: `10`, máx: `100`): Quantidade de artigos por página.
- `search` (string, opcional): Filtrar artigos por palavra-chave.
- `raw` (boolean, opcional): Se `true`, inclui o payload bruto original da fonte.

### 2. Consultar Mídias e Uploads de um Portal (`/api/media/{id}/content`)

Retorna a lista de imagens, fotos, uploads e anexos diretamente do endpoint de mídia do WordPress.

```bash
# Exemplo: Obter as últimas 5 mídias da fonte de mídia 28
curl -H "x-api-key: <SUA_API_KEY>" "https://seu-dominio.workers.dev/api/media/28/content?limit=5"
```

---

## Desenvolvimento e Deploy

```bash
npm install
npm run dev           # Servidor local de desenvolvimento (porta 3000)
npm run build         # Build do Next.js
npm run build:cloudflare  # Build para Cloudflare Workers via OpenNext
npm run deploy        # Deploy para Cloudflare Workers
```

---

© 2026 News Sources API. Todos os direitos reservados.
