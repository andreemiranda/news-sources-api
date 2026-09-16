# News Sources API - Documentação Completa

Bem-vindo à documentação detalhada da News Sources API. Esta API serve como um proxy e agregador em tempo real, permitindo acessar de forma unificada os dados, notícias e imagens de dezenas de portais brasileiros, padronizando saídas de REST APIs de WordPress e Feeds RSS.

> **Importante:** Todos os endpoints exigem autenticação enviando uma API Key (via header `x-api-key`, `Authorization` ou query parameter `api_key`).

## 1. Paginação e Formato de Resposta (Padrão WordPress)

Os endpoints de conteúdo (`/api/news/[id]` e `/api/images/[id]`) seguem estritamente o padrão da API REST do WordPress (WP REST API):
- A resposta é um **Array JSON** direto (`[ { ... }, { ... } ]`) e não um objeto encapsulado.
- Os metadados de paginação são informados via **Cabeçalhos HTTP (Headers)** na resposta:
  - `X-WP-Total`: Número total de itens disponíveis no servidor de origem.
  - `X-WP-TotalPages`: Número total de páginas disponíveis.

## 2. Parâmetros de Consulta (Query Params) Disponíveis nos Endpoints de Conteúdo

Ao consultar conteúdos (`/api/news/[id]` ou `/api/images/[id]`), você pode utilizar os seguintes parâmetros:
- `page` (integer, padrão: `1`): Número da página.
- `limit` ou `per_page` (integer, padrão: `10`, máx: `100`): Quantidade de itens por página.
- `search` (string): Filtrar o conteúdo por palavra-chave.
- `raw` (boolean, `true` ou `false`): Se `true`, inclui o payload bruto original da fonte na propriedade `raw` de cada item (útil para auditoria ou campos personalizados).
- `meta` (boolean, `true` ou `false`): Se `true`, o endpoint retorna apenas os metadados cadastrados daquela fonte específica (ID, site, categoria, URL original), sem buscar o conteúdo em tempo real.

---

## 3. Fontes de Notícias (Endpoints de Conteúdo)

A tabela abaixo lista nominalmente todas as fontes de notícias cadastradas, seus IDs (15 dígitos não-zero) e os endpoints correspondentes.

| ID | Categoria | Portal / Site | Tipo | Endpoint de Conteúdo em Tempo Real |
|---|---|---|---|---|
| `383841537673882` | Tocantins | clebertoledo.com.br | `wp-api` | `GET /api/news/383841537673882` |
| `893766336492326` | Educação | infoeducacao.com.br | `wp-api` | `GET /api/news/893766336492326` |
| `119282349536522` | Justiça | nacaojuridica.com.br | `wp-api` | `GET /api/news/119282349536522` |
| `138781293968447` | Tocantins | atitudeto.com.br | `wp-api` | `GET /api/news/138781293968447` |
| `912241216478934` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET /api/news/912241216478934` |
| `119319283249741` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET /api/news/119319283249741` |
| `673832516549963` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET /api/news/673832516549963` |
| `859131619791157` | Economia | minhaseconomias.com.br | `wp-api` | `GET /api/news/859131619791157` |
| `331649958919499` | Esporte | gazetaesportiva.com | `wp-api` | `GET /api/news/331649958919499` |
| `263228425877841` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET /api/news/263228425877841` |
| `914761953262293` | Finanças | classic.exame.com | `wp-api` | `GET /api/news/914761953262293` |
| `484292183833791` | Palmeiras | palmeiras.com.br | `wp-api` | `GET /api/news/484292183833791` |
| `699842191757118` | Goiás | opiniaogoias.com.br | `wp-api` | `GET /api/news/699842191757118` |
| `431642583394448` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET /api/news/431642583394448` |
| `232452491983424` | Goiás | diariodegoias.com.br | `wp-api` | `GET /api/news/232452491983424` |
| `382992878388555` | Justiça | conjur.com.br | `wp-api` | `GET /api/news/382992878388555` |
| `912895989897239` | Justiça | meusitejuridico.editorajuspodivm.com.br | `wp-api` | `GET /api/news/912895989897239` |
| `552434895747434` | Justiça | inw.org.br | `wp-api` | `GET /api/news/552434895747434` |
| `363855955883429` | Santa Catarina | santacatarinaempauta.com.br | `wp-api` | `GET /api/news/363855955883429` |
| `214239935451987` | Tocantins | vozdobico.com.br | `wp-api` | `GET /api/news/214239935451987` |
| `134352574919451` | Tocantins | portaldobico.com.br | `wp-api` | `GET /api/news/134352574919451` |
| `332328244549349` | Tocantins | folhadobico.com.br | `wp-api` | `GET /api/news/332328244549349` |
| `663841226123673` | Tocantins | bico24horas.com.br | `wp-api` | `GET /api/news/663841226123673` |
| `239261469443631` | Tocantins | guaraiense.com.br | `wp-api` | `GET /api/news/239261469443631` |
| `172626478241883` | Tocantins | jornalobico.com.br | `wp-api` | `GET /api/news/172626478241883` |
| `151892189935957` | Esporte | ludopedio.org.br | `wp-api` | `GET /api/news/151892189935957` |
| `432221191486213` | Notícias Gerais | folhadestra.com | `wp-api` | `GET /api/news/432221191486213` |
| `427785761975213` | Notícias Gerais | g1.globo.com | `rss` | `GET /api/news/427785761975213` |
| `892535683444992` | Santa Catarina | g1.globo.com | `rss` | `GET /api/news/892535683444992` |
| `974849684945474` | Tocantins | g1.globo.com | `rss` | `GET /api/news/974849684945474` |
| `324454919423913` | Sergipe | g1.globo.com | `rss` | `GET /api/news/324454919423913` |
| `691371344441814` | Vale do Paraíba e região | g1.globo.com | `rss` | `GET /api/news/691371344441814` |
| `897446178272719` | São Carlos e Araraquara | g1.globo.com | `rss` | `GET /api/news/897446178272719` |
| `933194249393993` | Santos e Região | g1.globo.com | `rss` | `GET /api/news/933194249393993` |
| `831839339459297` | Ribeirão Preto e Franca | g1.globo.com | `rss` | `GET /api/news/831839339459297` |
| `419124828553144` | Mogi das Cruzes e Suzano | g1.globo.com | `rss` | `GET /api/news/419124828553144` |
| `723191424424467` | Campinas e região | g1.globo.com | `rss` | `GET /api/news/723191424424467` |
| `342584813447811` | Bauru e Marília | g1.globo.com | `rss` | `GET /api/news/342584813447811` |
| `254882472956384` | Roraima | g1.globo.com | `rss` | `GET /api/news/254882472956384` |
| `245424281243145` | Rondônia | g1.globo.com | `rss` | `GET /api/news/245424281243145` |
| `766781992469928` | Rio Grande do Sul | g1.globo.com | `rss` | `GET /api/news/766781992469928` |
| `244133125413414` | Rio Grande do Norte | g1.globo.com | `rss` | `GET /api/news/244133125413414` |
| `161349844169333` | Sul e Costa Verde Fluminense | g1.globo.com | `rss` | `GET /api/news/161349844169333` |
| `831941689473231` | Norte Fluminense | g1.globo.com | `rss` | `GET /api/news/831941689473231` |
| `444363186445964` | Região dos Lagos Fluminense | g1.globo.com | `rss` | `GET /api/news/444363186445964` |
| `818829263524227` | Região Serrana Fluminense | g1.globo.com | `rss` | `GET /api/news/818829263524227` |
| `217484393242793` | Petrolina e Região | g1.globo.com | `rss` | `GET /api/news/217484393242793` |
| `784182842449454` | Caruaru e Região | g1.globo.com | `rss` | `GET /api/news/784182842449454` |
| `645274655999426` | Norte e Noroeste do Paraná | g1.globo.com | `rss` | `GET /api/news/645274655999426` |
| `451463938442293` | Oeste e Sudoeste do Paraná | g1.globo.com | `rss` | `GET /api/news/451463938442293` |
| `113941349457784` | Campos Gerais e Sul do Paraná | g1.globo.com | `rss` | `GET /api/news/113941349457784` |
| `499199511484742` | Paraná | g1.globo.com | `rss` | `GET /api/news/499199511484742` |
| `774995463939238` | Paraíba | g1.globo.com | `rss` | `GET /api/news/774995463939238` |
| `832514384744418` | Pará | g1.globo.com | `rss` | `GET /api/news/832514384744418` |
| `291958422149444` | Zona da Mata Mineira | g1.globo.com | `rss` | `GET /api/news/291958422149444` |
| `138925214465973` | Vales de Minas Gerais | g1.globo.com | `rss` | `GET /api/news/138925214465973` |
| `669176851683213` | Sul de Minas | g1.globo.com | `rss` | `GET /api/news/669176851683213` |
| `932144873293832` | Grande Minas | g1.globo.com | `rss` | `GET /api/news/932144873293832` |
| `338554224496117` | Centro-Oeste de Minas | g1.globo.com | `rss` | `GET /api/news/338554224496117` |
| `164134119431948` | Maranhão | g1.globo.com | `rss` | `GET /api/news/164134119431948` |
| `399912785456532` | Amazonas | g1.globo.com | `rss` | `GET /api/news/399912785456532` |
| `446149137873394` | Amapá | g1.globo.com | `rss` | `GET /api/news/446149137873394` |
| `597174398438273` | Alagoas | g1.globo.com | `rss` | `GET /api/news/597174398438273` |
| `142414733688861` | Acre | g1.globo.com | `rss` | `GET /api/news/142414733688861` |
| `494339475812222` | Turismo e Viagem | g1.globo.com | `rss` | `GET /api/news/494339475812222` |
| `158311376392135` | Tecnologia e Games | g1.globo.com | `rss` | `GET /api/news/158311376392135` |
| `429447432493472` | Pop & Arte | g1.globo.com | `rss` | `GET /api/news/429447432493472` |
| `477372321386414` | Mundo | g1.globo.com | `rss` | `GET /api/news/477372321386414` |
| `174666593891425` | Loterias | g1.globo.com | `rss` | `GET /api/news/174666593891425` |
| `863534413172943` | Educação | g1.globo.com | `rss` | `GET /api/news/863534413172943` |
| `411718493791472` | Economia | g1.globo.com | `rss` | `GET /api/news/411718493791472` |
| `123961798934467` | Autoesporte | g1.globo.com | `rss` | `GET /api/news/123961798934467` |

---

## 4. Fontes de Mídia e Imagens (Endpoints de Mídia)

A tabela abaixo lista todos os endpoints de mídia cadastrados. Esses endpoints consomem as rotas de mídia do WordPress (`/wp-json/wp/v2/media`) para listar uploads, imagens destacadas, arquivos e PDFs.

| ID | Categoria | Portal / Site | Tipo | Endpoint de Mídia em Tempo Real |
|---|---|---|---|---|
| `486786913592927` | Tocantins | clebertoledo.com.br | `wp-api` | `GET /api/images/486786913592927` |
| `912134149686499` | Educação | infoeducacao.com.br | `wp-api` | `GET /api/images/912134149686499` |
| `444923981352895` | Justiça | nacaojuridica.com.br | `wp-api` | `GET /api/images/444923981352895` |
| `169266432783153` | Tocantins | atitudeto.com.br | `wp-api` | `GET /api/images/169266432783153` |
| `434678845428483` | Tocantins | pmwnoticias.com.br | `wp-api` | `GET /api/images/434678845428483` |
| `497423334144814` | Notícias Gerais | admin.cnnbrasil.com.br | `wp-api` | `GET /api/images/497423334144814` |
| `223448219444334` | Tocantins | gazetadocerrado.com.br | `wp-api` | `GET /api/images/223448219444334` |
| `863518432848444` | Economia | minhaseconomias.com.br | `wp-api` | `GET /api/images/863518432848444` |
| `484645486132681` | Esporte | gazetaesportiva.com | `wp-api` | `GET /api/images/484645486132681` |
| `834112787618944` | Notícias Gerais | vocesa.abril.com.br | `wp-api` | `GET /api/images/834112787618944` |
| `625246249738681` | Finanças | classic.exame.com | `wp-api` | `GET /api/images/625246249738681` |
| `989168194342212` | Palmeiras | palmeiras.com.br | `wp-api` | `GET /api/images/989168194342212` |
| `919254945481739` | Goiás | opiniaogoias.com.br | `wp-api` | `GET /api/images/919254945481739` |
| `812781986514841` | Goiás | portalnoticiasgoias.com.br | `wp-api` | `GET /api/images/812781986514841` |
| `682395284214481` | Goiás | diariodegoias.com.br | `wp-api` | `GET /api/images/682395284214481` |
| `341848842488311` | Justiça | conjur.com.br | `wp-api` | `GET /api/images/341848842488311` |
| `395348329142712` | Justiça | meusitejuridico.editorajuspodivm.com.br | `wp-api` | `GET /api/images/395348329142712` |
| `495272632355925` | Justiça | inw.org.br | `wp-api` | `GET /api/images/495272632355925` |
| `838483453488994` | Santa Catarina | santacatarinaempauta.com.br | `wp-api` | `GET /api/images/838483453488994` |
| `483148981864871` | Tocantins | vozdobico.com.br | `wp-api` | `GET /api/images/483148981864871` |
| `848113483652935` | Tocantins | portaldobico.com.br | `wp-api` | `GET /api/images/848113483652935` |
| `299131149835223` | Tocantins | folhadobico.com.br | `wp-api` | `GET /api/images/299131149835223` |
| `124795614114419` | Tocantins | bico24horas.com.br | `wp-api` | `GET /api/images/124795614114419` |
| `219249543263144` | Tocantins | guaraiense.com.br | `wp-api` | `GET /api/images/219249543263144` |
| `627324364112142` | Tocantins | jornalobico.com.br | `wp-api` | `GET /api/images/627324364112142` |
| `571449685594348` | Esporte | ludopedio.org.br | `wp-api` | `GET /api/images/571449685594348` |
| `589639911226259` | Notícias Gerais | folhadestra.com | `wp-api` | `GET /api/images/589639911226259` |

---

## 5. Exemplos Práticos de Requisição e Resposta

### 5.1. Exemplo: Notícias em Tempo Real de uma Fonte (`GET /api/news/383841537673882`)

**Requisição cURL:**
```bash
curl -i "https://seu-dominio.com/api/news/383841537673882?page=1&limit=2"
```

**Resposta (200 OK):**
```http
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
```

---

### 5.2. Exemplo: Mídia em Tempo Real de um Portal (`GET /api/images/486786913592927`)

**Requisição cURL:**
```bash
curl -i "https://seu-dominio.com/api/images/486786913592927?page=1&limit=2"
```

**Resposta (200 OK):**
```http
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
```

---

## 6. Códigos de Status HTTP

| Código | Significado | Descrição |
|---|---|---|
| `200 OK` | Sucesso | Requisição processada com êxito e dados retornados |
| `401 Unauthorized` | Não Autorizado | Chave de API ausente, inválida ou não autorizada |
| `404 Not Found` | Não Encontrado | O ID da fonte não existe |
| `502 Bad Gateway` | Erro Upstream | Falha temporária ao comunicar com o servidor da fonte externa |

---
© 2026 News Sources API. Todos os direitos reservados.
