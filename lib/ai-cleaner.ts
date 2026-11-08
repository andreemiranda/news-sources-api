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
 * Protege URLs de mídias, links, arquivos e tags HTML de substituições indevidas.
 * Regra estrita: "a regra de troca de nome de 'G1' e demais palavras configuradas nas variaveis
 * não devem ser utilizadas quando estas palavras estiverem presentes em url's de mídias e arquivos
 * que seja ou esteja incorporadas no conteudo pois vai quebrar o link e devem prevalecer unicamente
 * e exclusivamente quando estas palavras aparecerem no conteudo como texto puro".
 */
export function protectMediaUrlsAndTags(text: string): {
  maskedText: string;
  restore: (processedText: string) => string;
} {
  if (!text) {
    return { maskedText: '', restore: () => '' };
  }

  const protectedPlaceholders: string[] = [];

  // Padrão que captura:
  // 1. Tags completas de imagem, mídia e links (<img ...>, <source ...>, <video ...>, <a ...>)
  // 2. URLs diretas de mídias, arquivos e links (http:// ou https://) suportando parênteses no path como /filters:strip_icc()/
  // 3. Atributos src="..." ou href="..."
  const mediaAndTagRegex = /<img\b[^>]*\/?>|<(?:video|audio|source)\b[^>]*\/?>|<a\b[^>]*>[\s\S]*?<\/a>|(?:src|href)=["'][^"']+["']|https?:\/\/[^\s<>"'`]+/gi;

  const maskedText = text.replace(mediaAndTagRegex, (matched) => {
    let urlOrTag = matched;
    let trailing = '';

    // Se for URL http/https crua, separa pontuação final de frase não pertencente à URL
    if (urlOrTag.startsWith('http://') || urlOrTag.startsWith('https://')) {
      while (urlOrTag.length > 0) {
        const last = urlOrTag[urlOrTag.length - 1];
        if (['.', ',', ';', '!', '?', ':'].includes(last)) {
          trailing = last + trailing;
          urlOrTag = urlOrTag.slice(0, -1);
        } else if (last === ')') {
          const openCount = (urlOrTag.match(/\(/g) || []).length;
          const closeCount = (urlOrTag.match(/\)/g) || []).length;
          if (closeCount > openCount) {
            trailing = last + trailing;
            urlOrTag = urlOrTag.slice(0, -1);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    const token = `__SAFE_MEDIA_TOKEN_${protectedPlaceholders.length}__`;
    protectedPlaceholders.push(urlOrTag);
    return token + trailing;
  });

  const restore = (processedText: string): string => {
    if (!processedText || protectedPlaceholders.length === 0) {
      return processedText;
    }
    return processedText.replace(/__SAFE_MEDIA_TOKEN_(\d+)__/g, (_, idxStr) => {
      const idx = Number(idxStr);
      return idx >= 0 && idx < protectedPlaceholders.length ? protectedPlaceholders[idx] : '';
    });
  };

  return { maskedText, restore };
}

/**
 * Em caso de citação do nome do direto proprietário da fonte dentro de parágrafos longos,
 * substitui o nome por outro para adequação à integração externa caso haja variável configurada,
 * preservando a continuidade e o entendimento da notícia sem quebrar o parágrafo longo.
 * NUNCA altera URLs de mídias e arquivos incorporados.
 */
export function replaceSourceOwnerInLongParagraphs(text: string): string {
  if (!text) return '';

  const { maskedText, restore } = protectMediaUrlsAndTags(text);

  const knownOwners = [
    { target: 'G1', regex: /\bG1\b/g },
    { target: 'CNN Brasil', regex: /\bCNN\s+Brasil\b/gi },
    { target: 'CNN', regex: /\bCNN\b/g },
    { target: 'Gazeta Esportiva', regex: /\bGazeta\s+Esportiva\b/gi },
    { target: 'Exame', regex: /\bExame\b/gi },
    { target: 'Abril', regex: /\bEditora\s+Abril\b|\bAbril\b/gi },
  ];

  let result = maskedText;
  for (const { target, regex } of knownOwners) {
    const replacement = getSourceOwnerReplacement(target);
    if (replacement) {
      result = result.replace(regex, replacement);
    }
  }

  return restore(result);
}

/**
 * Remove qualquer frase isolada que contenha a menção ao termo G1 ou marcas de fontes no texto puro.
 * Em parágrafos longos e conectados, caso haja uma variável de substituição configurada,
 * substitui o termo para não quebrar o entendimento da notícia.
 * URLs de mídias e arquivos são preservadas intactas e nunca removidas.
 */
export function removeG1Sentences(text: string): string {
  if (!text) return '';

  // 1. Proteger URLs de mídias, arquivos e tags para não quebrar links
  const { maskedText, restore } = protectMediaUrlsAndTags(text);

  // 2. Limpeza rápida de sufixos/prefixos comuns de títulos ou chamadas curtas
  let cleaned = maskedText
    .replace(/\s*[-–—|•·]\s*(?:G1|Portal G1|Globo G1|G1 Notícias)\s*$/i, '')
    .replace(/^(?:G1|Portal G1|Globo G1|G1 Notícias)\s*[-–—|•·:]\s*/i, '')
    .replace(/\s*\(Foto:\s*[^)]*G1[^)]*\)/gi, '')
    .replace(/\s*\(Vídeo:\s*[^)]*G1[^)]*\)/gi, '');

  const g1Replacement = getSourceOwnerReplacement('G1');

  // 3. Divisão e filtragem por parágrafos
  const paragraphs = cleaned.split(/\n+/);
  const cleanedParagraphs = paragraphs
    .map((paragraph) => {
      // Se não contém G1 no texto puro, mantém o parágrafo intacto
      if (!/\bG1\b/i.test(paragraph)) {
        return paragraph.trim();
      }

      // Parágrafo longo (mais de 140 caracteres) e existe variável de substituição:
      // Mantém a coesão substituindo o termo pelo valor da variável configurada no texto puro
      if (g1Replacement && paragraph.length >= 140) {
        return paragraph.replace(/\bG1\b/g, g1Replacement).trim();
      }

      // Caso contrário, divide em frases/sentenças por pontuação (. ! ? e quebras) e elimina as sentenças que citam G1
      const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g) || [paragraph];
      const keptSentences = sentences
        .map((s) => s.trim())
        .filter((s) => {
          if (s.length === 0) return false;
          // Se contém token de mídia protegida (ex.: tag de imagem), sempre manter
          if (/__SAFE_MEDIA_TOKEN_\d+__/.test(s) && !/\bG1\b/i.test(s.replace(/__SAFE_MEDIA_TOKEN_\d+__/g, ''))) {
            return true;
          }
          return !/\bG1\b/i.test(s);
        });

      // Se todas as frases tinham G1 ou não sobrou conteúdo substancial
      if (keptSentences.length === 0) {
        return '';
      }

      return keptSentences.join(' ').replace(/\s+/g, ' ').trim();
    })
    .filter((p) => p.length > 0);

  return restore(cleanedParagraphs.join('\n\n').trim());
}

/**
 * Pré-limpeza local com biblioteca e expressões regulares para:
 * 1. Proteger URLs de mídias e arquivos
 * 2. Sanitizar HTML
 * 3. Remover emojis, figurinhas e selos
 * 4. Remover chamadas e links para grupos de WhatsApp, canais de Telegram, perfis e redes sociais
 * 5. Remover qualquer frase ou parágrafo que mencione o termo G1 (ou substituir em parágrafos longos se houver variável) no texto puro
 * 6. Eliminar frases curtas e isoladas sem conteúdo jornalístico
 */
export function preCleanText(rawText: string): string {
  if (!rawText) return '';

  // 1. Proteger URLs de mídias, arquivos e tags antes de qualquer limpeza
  const { maskedText, restore } = protectMediaUrlsAndTags(rawText);

  // 2. Sanitização com biblioteca sanitize-html
  const sanitized = sanitizeHtml(maskedText, {
    allowedTags: ['p', 'br'],
    allowedAttributes: {},
    textFilter: (text) => text.replace(/&nbsp;/g, ' '),
  });

  // Converter quebras e tags em quebras de linha normais
  let text = sanitized
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');

  // 3. Remover Emojis e símbolos gráficos (compatível com todos os targets TS)
  const emojiRegex = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\uFE00-\uFE0F]/g;
  text = text.replace(emojiRegex, '');

  // 4. Remover marcas de verificação e selos
  text = text
    .replace(/\[\s*(?:NOTÍCIA VERIFICADA|VERIFICADO|EXCLUSIVO|CONFIRA|URGENTE|ATENÇÃO)\s*\]/gi, '')
    .replace(/(?:NOTÍCIA VERIFICADA|NOTICIA VERIFICADA|FATO VERIFICADO)\b/gi, '')
    .replace(/[✅✔☑️✓]/g, '');

  // 5. Remover pedidos de WhatsApp, grupos de Telegram, canais e perfis de redes sociais
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

  // 6. Substituição de proprietários de fontes em parágrafos longos caso haja variável configurada
  // (Aplica-se unicamente ao texto puro, preservando URLs)
  text = replaceSourceOwnerInLongParagraphs(text);

  // 7. Remover frases e menções com o termo G1 (e aplicar substituição em parágrafos longos se houver variável)
  // (Aplica-se unicamente ao texto puro, preservando URLs)
  text = removeG1Sentences(text);

  // 8. Quebrar em parágrafos e remover frases isoladas de pouco conteúdo (frases de interferência)
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => {
      // Se contiver token de mídia protegida, sempre preservar
      if (/__SAFE_MEDIA_TOKEN_\d+__/.test(p)) {
        return true;
      }
      if (p.length < 25) {
        return false;
      }
      if (/^(veja mais|leia também|saiba mais|clique aqui|confira|compartilhe|siga|inscreva-se|faça parte|bom[\s-]dia)/i.test(p)) {
        return false;
      }
      return true;
    });

  const cleaned = paragraphs.join('\n\n').trim();
  return restore(cleaned);
}

export function isAiConfigured(): boolean {
  const config = getEnv();
  return Boolean(config.AI_ENDPOINT && config.AI_API_KEY);
}

/**
 * Corrige o texto de uma notícia utilizando o endpoint privado de IA caso configurado.
 * Se a IA não estiver configurada ou falhar, retorna o texto pré-limpo sem chamada a provedores externos.
 * 
 * @param {string} textoPreLimpo - O texto pré-limpo da notícia
 * @returns {Promise<string>} O texto limpo e corrigido
 */
export async function processarEConfigurarNoticia(textoPreLimpo: string): Promise<string> {
  if (!textoPreLimpo || !textoPreLimpo.trim()) {
    return '';
  }

  // Se o texto for muito curto, retornar diretamente o texto pré-limpo
  if (textoPreLimpo.length < 60) {
    return textoPreLimpo;
  }

  const config = getEnv();
  const API_KEY = config.AI_API_KEY || '';
  const ENDPOINT = config.AI_ENDPOINT || '';
  const MODELO = config.AI_MODEL || '';

  // Chame processarEConfigurarNoticia somente se AI_ENDPOINT e AI_API_KEY estiverem configurados
  if (!ENDPOINT || !API_KEY) {
    return textoPreLimpo;
  }

  // Cache lookup para evitar chamadas redundantes e acelerar endpoints
  const cacheKey = crypto.createHash('md5').update(textoPreLimpo).digest('hex');
  if (textCleanCache.has(cacheKey)) {
    return textCleanCache.get(cacheKey)!;
  }

  // Protege URLs de mídias e arquivos antes de enviar para IA ou Pollinations
  const { maskedText, restore } = protectMediaUrlsAndTags(textoPreLimpo);

  // Instrução do sistema especializada em limpar o texto conforme as regras
  const systemPrompt =
    'Você é um revisor jornalístico profissional. Seu único objetivo é limpar o texto da notícia oriunda de um feed RSS, seguindo estritamente estas regras: 1. Elimine completamente emojis, figurinhas e marcas de verificação (como [VERIFICADO], selos, etc.). 2. Remova chamadas, links ou pedidos de acesso a grupos de WhatsApp, canais ou contatos da fonte. 3. Elimine totalmente qualquer frase que mencione a palavra ou marca G1 (como "no G1", "segundo o G1", "o G1 apurou", etc.). 4. Ignore frases isoladas de pouco conteúdo ou poucas letras (frases de interferência). 5. Mantenha apenas os parágrafos completos e originais que contêm o conteúdo real da notícia. 6. Nunca altere tokens protegidos de mídia como __SAFE_MEDIA_TOKEN_x__. 7. Nunca adicione saudações, introduções, conclusões ou formatações como Markdown extras (não use ** ou #). Retorne apenas o texto jornalístico limpo.';

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
          { role: 'user', content: maskedText },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const textoLimpo = data.choices?.[0]?.message?.content || data.text || '';
      const finalResult = restore((textoLimpo || maskedText).trim());

      if (textCleanCache.size >= MAX_CACHE_SIZE) textCleanCache.clear();
      textCleanCache.set(cacheKey, finalResult);
      return finalResult;
    }
  } catch (error) {
    console.warn('Falha no endpoint de IA privado:', error);
  }

  // Fallback otimizado com Pollinations (baixo timeout para não sobrecarregar CPU da Vercel)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: maskedText },
        ],
        model: 'openai',
        jsonMode: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const textoLimpo = await response.text();
      if (textoLimpo && textoLimpo.trim().length > 20 && !textoLimpo.startsWith('{')) {
        const cleanOutput = restore(textoLimpo.trim());
        if (textCleanCache.size >= MAX_CACHE_SIZE) textCleanCache.clear();
        textCleanCache.set(cacheKey, cleanOutput);
        return cleanOutput;
      }
    }
  } catch {
    // Retorna pré-limpeza em caso de timeout ou erro
  }

  const finalFallback = restore(maskedText);
  if (textCleanCache.size >= MAX_CACHE_SIZE) textCleanCache.clear();
  textCleanCache.set(cacheKey, finalFallback);
  return finalFallback;
}
