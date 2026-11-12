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
 * Regras dinâmicas de substituição de termos e marcas configuradas em variáveis de ambiente.
 * Aplica-se ESTRITAMENTE ao conteúdo de texto e NUNCA a URLs ou links de mídias/arquivos.
 */
export function getReplacementRules(): { target: string; replacement: string; regex: RegExp }[] {
  const config = getEnv();
  const rulesMap = new Map<string, string>();

  // 1. Mapeamento customizado de proprietários (SOURCE_OWNER_REPLACEMENTS)
  if (config.SOURCE_OWNER_REPLACEMENTS && typeof config.SOURCE_OWNER_REPLACEMENTS === 'object') {
    for (const [k, v] of Object.entries(config.SOURCE_OWNER_REPLACEMENTS)) {
      if (k && typeof v === 'string' && v.trim() && k.toUpperCase() !== 'DEFAULT') {
        rulesMap.set(k.trim(), v.trim());
      }
    }
  }

  // 2. Variável de ambiente direta G1_REPLACEMENT
  if (config.G1_REPLACEMENT && config.G1_REPLACEMENT.trim()) {
    rulesMap.set('G1', config.G1_REPLACEMENT.trim());
  }

  // 3. Fallback geral de proprietário (SOURCE_OWNER_REPLACEMENT)
  if (config.SOURCE_OWNER_REPLACEMENT && config.SOURCE_OWNER_REPLACEMENT.trim()) {
    const general = config.SOURCE_OWNER_REPLACEMENT.trim();
    const commonTargets = [
      'G1', 'CNN Brasil', 'CNN', 'Gazeta Esportiva', 'Exame', 'Editora Abril', 'Abril',
      'Conjur', 'Cleber Toledo', 'Atitude TO', 'PMW Notícias', 'Gazeta do Cerrado',
      'Voz do Bico', 'Portal do Bico', 'Folha do Bico', 'Bico 24 Horas', 'Guaraiense',
      'Jornal O Bico', 'Opinião Goiás', 'Portal Notícias Goiás', 'Diário de Goiás',
      'Nação Jurídica', 'Meu Site Jurídico', 'INW', 'Âmbito Jurídico', 'Justa',
      'O Direito', 'Rota Jurídica', 'Ludopédio', 'Você S/A', 'Folha Destra',
      'Minhas Economias', 'Info Educação', 'Santa Catarina em Pauta'
    ];
    for (const name of commonTargets) {
      if (!rulesMap.has(name)) {
        rulesMap.set(name, general);
      }
    }
  }

  // Ordena termos por tamanho decrescente para que termos mais longos ("CNN Brasil")
  // sejam substituídos antes de termos mais curtos ("CNN")
  return Array.from(rulesMap.entries())
    .sort((a, b) => b[0].length - a[0].length)
    .map(([target, replacement]) => {
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const isWord = /^[a-zA-Z0-9]/.test(target) && /[a-zA-Z0-9]$/.test(target);
      const pattern = isWord ? `\\b${escaped}\\b` : escaped;
      return {
        target,
        replacement,
        regex: new RegExp(pattern, 'gi'),
      };
    });
}

/**
 * Protege URLs de mídias, links, arquivos e tags HTML de substituições indevidas.
 * Regra estrita: as trocas de termos e palavras contidas nas variáveis específicas
 * devem valer APENAS para o conteúdo de frontend/texto e NUNCA para URLs,
 * para não quebrar links, imagens, vídeos, áudios e arquivos incorporados.
 */
export function protectMediaUrlsAndTags(text: string): {
  maskedText: string;
  restore: (processedText: string) => string;
} {
  if (!text) {
    return { maskedText: '', restore: () => '' };
  }

  const protectedPlaceholders: string[] = [];

  // Padrão rigoroso que protege:
  // 1. Elementos de mídia e incorporação completos (<video ...>...</video>, <audio ...>...</audio>, <iframe ...></iframe>, <figure>, <picture>, <object>, <embed>)
  // 2. Tags de imagem e mídia autônomas (<img ...>, <source ...>, <video .../>, <audio .../>, <iframe .../>)
  // 3. Abertura e fechamento de links com URLs (<a href="..."> e </a>)
  // 4. Qualquer atributo de link ou mídia (src="...", href="...", poster="...", data-src="...", srcset="...")
  // 5. Chamadas CSS url(...)
  // 6. URLs absolutas (http://, https://, //)
  // 7. Caminhos relativos de arquivos de mídia, áudio, vídeo, imagem e documentos
  const mediaAndTagRegex =
    /<(?:video|audio|iframe|object|embed)\b[\s\S]*?<\/(?:video|audio|iframe|object|embed)>|<(?:img|video|audio|source|embed|iframe)\b[^>]*\/?>|<a\b[^>]*\bhref=["'][^"']+["'][^>]*>|<\/a>|\b(?:src|data-src|data-lazy-src|data-original|data-orig-file|poster|srcset|href)=["'][^"']*["']|url\(\s*["']?[^"')]+["']?\s*\)|(?:https?:)?\/\/[^\s<>"'`]+|(?:\/|\.\/|\.\.\/)[^\s<>"'`]+\.(?:jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|mp4|webm|ogv|avi|mov|mkv|mp3|wav|ogg|m4a|aac|flac|wma|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)(?:\?[^\s<>"'`]*)?/gi;

  const maskedText = text.replace(mediaAndTagRegex, (matched) => {
    let urlOrTag = matched;
    let trailing = '';

    // Se for URL http/https crua, separa pontuação final de frase não pertencente à URL
    if (urlOrTag.startsWith('http://') || urlOrTag.startsWith('https://') || urlOrTag.startsWith('//')) {
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
 * Em caso de citação de proprietários/marcas configuradas no texto de frontend,
 * substitui o termo pelo valor da variável preservando integralmente o entendimento da notícia.
 * NUNCA altera URLs de mídias, arquivos, áudios, vídeos ou imagens.
 */
export function replaceSourceOwnerInLongParagraphs(text: string): string {
  if (!text) return '';

  const { maskedText, restore } = protectMediaUrlsAndTags(text);
  const rules = getReplacementRules();

  let result = maskedText;
  for (const { regex, replacement } of rules) {
    result = result.replace(regex, replacement);
  }

  return restore(result);
}

/**
 * Remove menções a G1 ou substitui o termo conforme variáveis configuradas.
 * Se houver G1_REPLACEMENT ou SOURCE_OWNER_REPLACEMENTS, substitui o termo no texto puro.
 * Se não houver substituição configurada, elimina sentenças isoladas com menção a G1.
 * URLs de mídias, fotos, vídeos e arquivos são 100% preservadas e nunca modificadas.
 */
export function removeG1Sentences(text: string): string {
  if (!text) return '';

  // 1. Proteger URLs de mídias, arquivos e tags para não quebrar links
  const { maskedText, restore } = protectMediaUrlsAndTags(text);

  // 2. Limpeza rápida de sufixos/prefixos comuns de títulos ou chamadas curtas
  let cleaned = maskedText
    .replace(/\s*[-–—|•·]\s*(?:G1|Portal G1|Globo G1|G1 Notícias)\s*$/i, '')
    .replace(/^(?:G1|Portal G1|Globo G1|G1 Notícias)\s*[-–—|•·:]\s*/i, '');

  const g1Replacement = getSourceOwnerReplacement('G1');

  // Se existe variável de substituição para G1, substitui o termo no texto puro
  if (g1Replacement) {
    cleaned = cleaned.replace(/\bG1\b/gi, g1Replacement);
    return restore(cleaned.trim());
  }

  // Se NÃO houver substituição configurada, elimina frases isoladas que mencionam G1
  const paragraphs = cleaned.split(/\n+/);
  const cleanedParagraphs = paragraphs
    .map((paragraph) => {
      if (!/\bG1\b/i.test(paragraph)) {
        return paragraph.trim();
      }

      const sentences = paragraph.match(/[^.!?]+(?:[.!?]+|$)/g) || [paragraph];
      const keptSentences = sentences
        .map((s) => s.trim())
        .filter((s) => {
          if (s.length === 0) return false;
          if (/__SAFE_MEDIA_TOKEN_\d+__/.test(s) && !/\bG1\b/i.test(s.replace(/__SAFE_MEDIA_TOKEN_\d+__/g, ''))) {
            return true;
          }
          return !/\bG1\b/i.test(s);
        });

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
