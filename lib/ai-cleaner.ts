import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';
import { getEnv } from '@/src/config/env';

// In-memory cache to prevent overloading free Pollinations API and keep responses fast
const textCleanCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

/**
 * Mapa configurável de proprietários/marcas de fontes para substituição em parágrafos longos
 * configurável via variáveis de ambiente (ex.: SOURCE_OWNER_REPLACEMENTS='{"G1":"Portal Notícias","CNN":"Portal de Notícias"}')
 * ou SOURCE_OWNER_REPLACEMENT / G1_REPLACEMENT
 */
export function getSourceOwnerReplacement(name: string): string | null {
  const normalized = name.trim().toUpperCase();
  const config = getEnv();

  // 1. Variável de mapeamento JSON customizada
  if (config.SOURCE_OWNER_REPLACEMENTS) {
    for (const [k, v] of Object.entries(config.SOURCE_OWNER_REPLACEMENTS)) {
      if (k.trim().toUpperCase() === normalized && typeof v === 'string') {
        return v;
      }
    }
    if (config.SOURCE_OWNER_REPLACEMENTS.DEFAULT) {
      return config.SOURCE_OWNER_REPLACEMENTS.DEFAULT;
    }
  }

  // 2. Variável de ambiente direta (ex.: G1_REPLACEMENT, CNN_REPLACEMENT)
  if (normalized === 'G1' && config.G1_REPLACEMENT) {
    return config.G1_REPLACEMENT;
  }
  const envDirect = process.env[`${normalized}_REPLACEMENT`];
  if (envDirect && envDirect.trim()) {
    return envDirect.trim();
  }

  // 3. Variável de ambiente geral padrão para substituição de proprietário da fonte
  if (config.SOURCE_OWNER_REPLACEMENT) {
    return config.SOURCE_OWNER_REPLACEMENT;
  }

  return null;
}

/**
 * Em caso de citação do nome do direto proprietário da fonte dentro de parágrafos longos,
 * substitui o nome por outro para adequação à integração externa caso haja variável configurada,
 * preservando a continuidade e o entendimento da notícia sem quebrar o parágrafo longo.
 */
export function replaceSourceOwnerInLongParagraphs(text: string): string {
  if (!text) return '';

  const knownOwners = [
    { target: 'G1', regex: /\bG1\b/g },
    { target: 'CNN Brasil', regex: /\bCNN\s+Brasil\b/gi },
    { target: 'CNN', regex: /\bCNN\b/g },
    { target: 'Gazeta Esportiva', regex: /\bGazeta\s+Esportiva\b/gi },
    { target: 'Exame', regex: /\bExame\b/gi },
    { target: 'Abril', regex: /\bEditora\s+Abril\b|\bAbril\b/gi },
  ];

  let result = text;
  for (const { target, regex } of knownOwners) {
    const replacement = getSourceOwnerReplacement(target);
    if (replacement) {
      result = result.replace(regex, replacement);
    }
  }

  return result;
}

/**
 * Remove qualquer frase isolada que contenha a menção ao termo G1 ou marcas de fontes.
 * Em parágrafos longos e conectados, caso haja uma variável de substituição configurada,
 * substitui o termo para não quebrar o entendimento da notícia.
 */
export function removeG1Sentences(text: string): string {
  if (!text) return '';

  // 1. Limpeza rápida de sufixos/prefixos comuns de títulos ou chamadas curtas
  let cleaned = text
    .replace(/\s*[-–—|•·]\s*(?:G1|Portal G1|Globo G1|G1 Notícias)\s*$/i, '')
    .replace(/^(?:G1|Portal G1|Globo G1|G1 Notícias)\s*[-–—|•·:]\s*/i, '')
    .replace(/\s*\(Foto:\s*[^)]*G1[^)]*\)/gi, '')
    .replace(/\s*\(Vídeo:\s*[^)]*G1[^)]*\)/gi, '');

  const g1Replacement = getSourceOwnerReplacement('G1');

  // 2. Divisão e filtragem por parágrafos
  const paragraphs = cleaned.split(/\n+/);
  const cleanedParagraphs = paragraphs
    .map((paragraph) => {
      // Se não contém G1, mantém o parágrafo intacto
      if (!/\bG1\b/i.test(paragraph)) {
        return paragraph.trim();
      }

      // Parágrafo longo (mais de 140 caracteres) e existe variável de substituição:
      // Mantém a coesão substituindo o termo pelo valor da variável configurada
      if (g1Replacement && paragraph.length >= 140) {
        return paragraph.replace(/\bG1\b/g, g1Replacement).trim();
      }

      // Caso contrário, divide em frases/sentenças por pontuação (. ! ? e quebras) e elimina as sentenças que citam G1
      const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g) || [paragraph];
      const keptSentences = sentences
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !/\bG1\b/i.test(s));

      // Se todas as frases tinham G1 ou não sobrou conteúdo substancial
      if (keptSentences.length === 0) {
        return '';
      }

      return keptSentences.join(' ').replace(/\s+/g, ' ').trim();
    })
    .filter((p) => p.length > 0);

  return cleanedParagraphs.join('\n\n').trim();
}

/**
 * Pré-limpeza local com biblioteca e expressões regulares para:
 * 1. Sanitizar HTML
 * 2. Remover emojis, figurinhas e selos
 * 3. Remover chamadas e links para grupos de WhatsApp, canais de Telegram, perfis e redes sociais
 * 4. Remover qualquer frase ou parágrafo que mencione o termo G1 (ou substituir em parágrafos longos se houver variável)
 * 5. Eliminar frases curtas e isoladas sem conteúdo jornalístico
 */
export function preCleanText(rawText: string): string {
  if (!rawText) return '';

  // 1. Sanitização com biblioteca sanitize-html
  const sanitized = sanitizeHtml(rawText, {
    allowedTags: ['p', 'br'],
    allowedAttributes: {},
    textFilter: (text) => text.replace(/&nbsp;/g, ' '),
  });

  // Converter quebras e tags em quebras de linha normais
  let text = sanitized
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');

  // 2. Remover Emojis e símbolos gráficos (compatível com todos os targets TS)
  const emojiRegex = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\uFE00-\uFE0F]/g;
  text = text.replace(emojiRegex, '');

  // 3. Remover marcas de verificação e selos
  text = text
    .replace(/\[\s*(?:NOTÍCIA VERIFICADA|VERIFICADO|EXCLUSIVO|CONFIRA|URGENTE|ATENÇÃO)\s*\]/gi, '')
    .replace(/(?:NOTÍCIA VERIFICADA|NOTICIA VERIFICADA|FATO VERIFICADO)\b/gi, '')
    .replace(/[✅✔☑️✓]/g, '');

  // 4. Remover pedidos de WhatsApp, grupos de Telegram, canais e perfis de redes sociais
  text = text
    // WhatsApp (grupos, canais, links diretos)
    .replace(/(?:👉|🔗|📱|📲)?\s*(?:entre\s+no|acesse\s+o|participe\s+do|siga\s+o|clique\s+para\s+entrar\s+no)\s+(?:nosso\s+)?(?:grupo|canal|comunidade)\s+(?:do\s+)?whatsapp[^\n.]*(?:\.|$)?/gi, '')
    .replace(/(?:link|acesse|clique\s+aqui)[\s:]+(?:https?:\/\/)?(?:chat\.)?whatsapp\.com\S*/gi, '')
    .replace(/https?:\/\/(?:chat\.)?whatsapp\.com\S*/gi, '')
    // Telegram (grupos, canais, links diretos t.me)
    .replace(/(?:👉|🔗|📱|📲)?\s*(?:entre\s+no|acesse\s+o|participe\s+do|siga\s+o)\s+(?:nosso\s+)?(?:grupo|canal|comunidade)\s+(?:do\s+)?telegram[^\n.]*(?:\.|$)?/gi, '')
    .replace(/(?:link|acesse|clique\s+aqui)[\s:]+(?:https?:\/\/)?(?:t\.me|telegram\.me)\S*/gi, '')
    .replace(/https?:\/\/(?:t\.me|telegram\.me)\S*/gi, '')
    // Redes sociais em geral (Instagram, Facebook, X/Twitter, TikTok, YouTube, Threads)
    .replace(/(?:👉|🔗|📱|📲)?\s*(?:siga|acesse|acompanhe|inscreva-se\s+em|curta)\s+(?:a|o|nosso|nossa|as)?\s*(?:redes?\s+socia(?:l|is)|p[aá]gina|perfil|canal)\s+(?:no\s+)?(?:instagram|facebook|twitter|tiktok|youtube|threads|linkedin)[^\n.]*(?:\.|$)?/gi, '')
    .replace(/(?:siga|acompanhe)\s+no\s+(?:instagram|facebook|twitter|tiktok|youtube|threads)[^\n.]*(?:\.|$)?/gi, '')
    .replace(/(?:siga|acompanhe)\s+nossas?\s+redes\s+sociais[^\n.]*(?:\.|$)?/gi, '')
    .replace(/inscreva-se\s+no\s+(?:nosso\s+)?canal[^\n.]*(?:\.|$)?/gi, '')
    // Links de redes sociais
    .replace(/https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|threads\.net)\/[^\s<>"']+/gi, '')
    // Chamadas genéricas de engajamento
    .replace(/para\s+não\s+perder\s+nada[^\n.]*(?:\.|$)?/gi, '')
    .replace(/dê\s+um\s+joinha[^\n.]*(?:\.|$)?/gi, '')
    .replace(/compartilhe\s+com\s+(?:amigos|familiares|todos)[^\n.]*(?:\.|$)?/gi, '');

  // 5. Substituição de proprietários de fontes em parágrafos longos caso haja variável configurada
  text = replaceSourceOwnerInLongParagraphs(text);

  // 6. Remover frases e menções com o termo G1 (e aplicar substituição em parágrafos longos se houver variável)
  text = removeG1Sentences(text);

  // 7. Quebrar em parágrafos e remover frases isoladas de pouco conteúdo (frases de interferência)
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => {
      if (p.length < 25) {
        // Frase muito curta isolada
        return false;
      }
      if (/^(veja mais|leia também|saiba mais|clique aqui|confira|compartilhe|siga|inscreva-se|faça parte)/i.test(p)) {
        return false;
      }
      return true;
    });

  return paragraphs.join('\n\n').trim();
}

/**
 * Corrige o texto de uma notícia de feed RSS/XML eliminando emojis, marcas de verificação,
 * links/pedidos de WhatsApp, frases com menção ao termo G1 e mantendo apenas os parágrafos completos do conteúdo.
 * 
 * Se houver AI_ENDPOINT e AI_API_KEY nas variáveis de ambiente, utiliza o endpoint privado.
 * Caso contrário, utiliza a IA Pollinations gratuita (sem chave).
 * 
 * @param {string} textoNoticia - O texto bruto extraído do feed RSS
 * @returns {Promise<string>} O texto limpo e corrigido
 */
export async function processarEConfigurarNoticia(textoNoticia: string): Promise<string> {
  if (!textoNoticia || !textoNoticia.trim()) {
    return '';
  }

  // 0. Pré-limpeza local com biblioteca e filtros para não sobrecarregar a IA
  const textoPreLimpo = preCleanText(textoNoticia);
  if (!textoPreLimpo) {
    return '';
  }

  // Se o texto for muito curto, retornar diretamente o texto pré-limpo
  if (textoPreLimpo.length < 60) {
    return textoPreLimpo;
  }

  // Cache lookup para evitar chamadas redundantes e acelerar endpoints
  const cacheKey = crypto.createHash('md5').update(textoPreLimpo).digest('hex');
  if (textCleanCache.has(cacheKey)) {
    return textCleanCache.get(cacheKey)!;
  }

  // 1. Definição das variáveis de ambiente centralizadas
  const config = getEnv();
  const API_KEY = config.AI_API_KEY || '';
  const ENDPOINT = config.AI_ENDPOINT || '';
  const MODELO = config.AI_MODEL || '';

  // Instrução do sistema especializada em limpar o texto conforme as regras
  const systemPrompt =
    'Você é um revisor jornalístico profissional. Seu único objetivo é limpar o texto da notícia oriunda de um feed RSS, seguindo estritamente estas regras: 1. Elimine completamente emojis, figurinhas e marcas de verificação (como [VERIFICADO], selos, etc.). 2. Remova chamadas, links ou pedidos de acesso a grupos de WhatsApp, canais ou contatos da fonte. 3. Elimine totalmente qualquer frase que mencione a palavra ou marca G1 (como "no G1", "segundo o G1", "o G1 apurou", etc.). 4. Ignore frases isoladas de pouco conteúdo ou poucas letras (frases de interferência). 5. Mantenha apenas os parágrafos completos e originais que contêm o conteúdo real da notícia. 6. Nunca adicione saudações, introduções, conclusões ou formatações como Markdown extras (não use ** ou #). Retorne apenas o texto jornalístico limpo.';

  // 2. Verificação de Fluxo: Se houver Endpoint e Chave configurados, usa a API privada
  if (ENDPOINT && API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODELO || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: textoPreLimpo },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro no Endpoint Privado: ${response.statusText}`);
      }

      const data = await response.json();
      const textoLimpo = data.choices?.[0]?.message?.content || data.text || '';
      const finalResult = (textoLimpo || textoPreLimpo).trim();

      if (textCleanCache.size >= MAX_CACHE_SIZE) textCleanCache.clear();
      textCleanCache.set(cacheKey, finalResult);
      return finalResult;
    } catch (error) {
      console.warn('Falha no endpoint privado. Tentando redundância com Pollinations.AI...', error);
    }
  }

  // 3. Fallback: Uso da IA Pollinations gratuita (Sem API Key)
  const urlPollinations = 'https://text.pollinations.ai/';
  const payloadPollinations = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: textoPreLimpo },
    ],
    model: 'openai',
    jsonMode: false,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(urlPollinations, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadPollinations),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const textoLimpo = await response.text();
      if (textoLimpo && textoLimpo.trim().length > 20 && !textoLimpo.startsWith('{')) {
        const cleanOutput = textoLimpo.trim();
        if (textCleanCache.size >= MAX_CACHE_SIZE) textCleanCache.clear();
        textCleanCache.set(cacheKey, cleanOutput);
        return cleanOutput;
      }
    }
  } catch {
    // Falha de rede ou timeout silencioso na IA externa; fallback gracioso para a pré-limpeza
  }

  // Se a IA externa falhar, demorar ou retornar erro de pagamento/quota, retorna a pré-limpeza sanitizada
  if (textCleanCache.size >= MAX_CACHE_SIZE) textCleanCache.clear();
  textCleanCache.set(cacheKey, textoPreLimpo);
  return textoPreLimpo;
}
