# Remoção de Frases com o Termo G1 em Feeds XML/RSS

Este plano define a estratégia de higienização automatizada em nível de pré-limpeza e processamento por biblioteca/IA para remover completamente qualquer frase contendo a menção à marca/veículo "G1" de todos os campos de texto das notícias provenientes de feeds RSS/XML.

## Decisões Confirmadas

> [!IMPORTANT]
> - **Campos abrangidos:** Todos os campos de texto do feed RSS (`title`, `description`, `content`, `author`, `categories`).
> - **Abordagem de remoção:** Remover a frase inteira que cita o termo "G1" (frases curtas ou longas que contenham menções como "no G1", "segundo o G1", "leia mais no G1", "o G1 apurou...", etc.), além de suprimir autores e categorias residuais.

---

## 1. Visão Geral e Conceito

O sistema atualmente agrega feeds RSS de portais de notícias (incluindo g1.globo.com). Ao alimentar a API unificada e disponibilizar os dados nos endpoints `/api/news/[id]`, o objetivo é que o conteúdo jornalístico seja mantido limpo, impessoal e desprovido de marcas d'água, autopromoções e créditos repetitivos de plataforma de origem.

A limpeza será executada diretamente na camada de parsing de XML/RSS (`lib/content.ts`) e na ferramenta de higienização de texto (`lib/ai-cleaner.ts`), garantindo que tanto a pré-limpeza determinística quanto a inteligência artificial removam integralmente as sentenças que contenham o termo.

---

## 2. Experiência do Usuário e Especificação dos Dados

Ao consultar endpoints como `/api/news`, `/api/news/{id}` para fontes do tipo RSS:
- O campo `title` terá menções residuais a G1 ou prefixos/sufixos removidos de maneira fluida.
- Os campos `description` e `content` terão parágrafos e frases que citam o termo G1 expurgados sem deixar pontuações soltas ou espaços em branco anômalos.
- `author` que contiver apenas "G1" ou menções derivadas continuará omitido ou limpo.
- `categories` que incluam o termo "G1" continuarão estritamente filtradas.
- Todas as tags HATEOAS (`_links`), paginação, meta headers (`X-WP-Total`, `X-WP-TotalPages`) e slug continuarão intactos.

---

## 3. Principais Decisões de Produto & Arquitetura

1. **Camada de Limpeza Determinística Local (`lib/ai-cleaner.ts`):**
   - Implementar no `preCleanText` uma etapa dedicada que segmenta o texto por frases/pontuação (`.` , `!`, `?`, `\n`) e descarta sentenças completas que contenham a palavra isolada `G1` (case-insensitive com regex boundary `\bG1\b`).
   - Se a frase contiver apenas o termo ou for uma chamada curta ("Veja mais no G1", "Acompanhe no G1", "Do G1"), ela é eliminada imediatamente.
   - Em títulos (`title`), se contiver " - G1" ou " | G1", esses sufixos são aparados. Se for uma frase interna, é higienizada mantendo a coesão do título.

2. **Refinamento do Prompt da IA (`lib/ai-cleaner.ts`):**
   - Atualizar o `systemPrompt` tanto para o endpoint de IA privado quanto para o fallback gratuito (Pollinations), instruindo expressamente a IA a descartar frases que citem o veículo "G1".

3. **Garantia no Parser de RSS (`lib/content.ts`):**
   - Aplicar a higienização de frases com G1 também durante a extração de `description`, `content:encoded` e `title` na função `parseRssFeed`.

---

## 4. Diagrama de Arquitetura e Fluxo

```
┌────────────────────────────────────────────────────────┐
│                    Feed XML / RSS                      │
└──────────────────────────┬─────────────────────────────┘
                           │ fetch XML
                           ▼
┌────────────────────────────────────────────────────────┐
│             parseRssFeed (lib/content.ts)              │
│  - Extrai title, description, content, author, cats    │
│  - Remove sufixos e menções "G1" no título             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│           preCleanText (lib/ai-cleaner.ts)             │
│  - Sanitização HTML (sanitize-html)                    │
│  - Filtro Regex: Sentenças contendo \bG1\b             │
│  - Remoção de emojis, selos e links de WhatsApp        │
│  - Descarte de frases curtas de interferência          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│      processarEConfigurarNoticia (lib/ai-cleaner.ts)   │
│  - Prompt de IA instruído para não incluir frases G1   │
│  - Cache em memória para desempenho máximo             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Endpoints da API (/api/news/[id])           │
│  - JSON estruturado limpo, sem citações de G1          │
│  - Formato padronizado e metadados HATEOAS preservados │
└────────────────────────────────────────────────────────┘
```
