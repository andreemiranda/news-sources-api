import he from 'he';
import { Source, generate6DigitId, getSourceById, getMediaSourceById } from './sources';
import { processarEConfigurarNoticia, preCleanText, removeG1Sentences, isAiConfigured, protectMediaUrlsAndTags } from './ai-cleaner';

export interface ContentItem {
  id: number;
  title: string;
  slug: string;
  alt: string;
  description?: string;
  content?: string;
  pubDate?: string;
  author?: string;
  category?: string;
  categories?: string[];
  source?: string;
  sourceId?: number | string;
  imageUrl?: string;
  image?: string;
  availableImages?: string[];
  _links?: Record<string, { href: string | null }>;
}

export interface ContentResponse {
  source: Source;
  feed?: {
    title?: string;
    description?: string;
    language?: string;
    lastBuildDate?: string;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  items: ContentItem[];
}

export interface FetchOptions {
  page?: number;
  limit?: number;
  search?: string;
  raw?: boolean;
  bypassCache?: boolean;
}

export function cleanText(input: string | undefined | null): string {
  if (!input) return '';
  let str = String(input);
  try {
    str = he.decode(str);
  } catch (e) {}

  try {
    if (/[\u00C2-\u00DF][\u0080-\u00BF]/.test(str)) {
      const fixed = Buffer.from(str, 'latin1').toString('utf8');
      if (!fixed.includes('\uFFFD')) {
        str = fixed;
      }
    }
  } catch (e) {}

  try {
    if (/&#?\w+;/.test(str)) {
      str = he.decode(str);
    }
  } catch (e) {}

  return str
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function isGenericMediaTitle(title: string | undefined | null): boolean {
  if (!title) return true;
  const clean = title.trim();
  if (clean.length < 3) return true;
  if (/^(m[ií]dia|imagem|foto|sem t[ií]tulo|image|photo)$/i.test(clean)) return true;
  if (/^[0-9A-Za-z_-]{4,20}$/.test(clean) && (/\d/.test(clean) || /^[A-Z0-9_]+$/.test(clean))) return true;
  if (/^(img|dsc|whatsapp|screenshot|foto|imagem|banner|capa)[-_0-9]/i.test(clean)) return true;
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(clean)) return true;
  return false;
}

/**
 * Analisa se a notícia é uma chamada de vídeo / telejornal / transmissão ao vivo
 * que veio sem conteúdo substancial (devido a incorporação falha ou post apenas com player de vídeo).
 * Se tiver conteúdo jornalístico longo e real, ela é preservada; caso contrário, é removida da API.
 */
export function isVideoBroadcastWithoutContent(
  title: string | undefined | null,
  content: string | undefined | null,
  description: string | undefined | null
): boolean {
  const rawTitle = (title || '').trim();
  const rawContent = (content || '').trim();
  const rawDesc = (description || '').trim();

  // Calcular o comprimento real do texto explicativo/jornalístico além do título
  const textBody = rawContent.length > rawDesc.length ? rawContent : rawDesc;
  // Subtrair o título do texto de forma segura sem falha de regex
  let cleanBodyWithoutTitle = textBody;
  if (rawTitle) {
    cleanBodyWithoutTitle = cleanBodyWithoutTitle.split(rawTitle).join('').trim();
  }

  // Se o conteúdo textual for longo e consistente (mais de 180 caracteres reais), mantém na API
  if (cleanBodyWithoutTitle.length >= 180) {
    return false;
  }

  // 1. Padrões característicos no título que indicam compilados de vídeos, telejornais ou íntegras/ao vivo
  const videoTitlePatterns = [
    /^\s*V[ÍI]DEOS?\s*:/i,
    /^\s*ASSISTA\s*:/i,
    /^\s*AO\s+VIVO\s*:/i,
    /\b(?:assista\s+(?:aos?|à|ao|as)?\s*(?:v[íi]deos|telejornais|programas?|transmiss[ãa]o|programa[çc][ãa]o))\b/i,
    /\b(?:assista\s+ao\s+vivo|acompanhe\s+ao\s+vivo|veja\s+ao\s+vivo)\b/i,
    /\b(?:veja\s+os\s+v[íi]deos|confira\s+os\s+v[íi]deos)\b/i,
    /\b(?:jornal\s+anhanguera|jornal\s+do\s+almo[çc]o|bom\s+dia\s+[a-zà-ú\s]+|jl[12]|bdp|nsc\s+not[íi]cias|jornal\s+nacional|jornal\s+hoje|fant[áa]stico|globo\s+rural|jornal\s+da\s+globo|globo\s+esporte)\b.*(?:de\s+\w+-feira|de\s+\d+\s+de)/i,
    /\b(?:[12]ª\s+edi[çc][ãa]o|edi[çc][ãa]o\s+das\s+\d+h)\b.*(?:de\s+\w+-feira|de\s+\d+\s+de)/i,
    /\b(?:íntegra|integra)\s+do\s+(?:telejornal|programa)\b/i,
    /\b(?:ao\s+vivo:\s*assista|ao\s+vivo\s*-\s*assista)\b/i,
    /\b(?:tv\s+[a-zà-ú\s]+\s+ao\s+vivo:\s*assista)\b/i,
  ];

  const hasVideoTitle = videoTitlePatterns.some((pattern) => pattern.test(rawTitle));

  // 2. Padrões no corpo que indicam chamadas vazias de vídeo / transmissão
  const hasVideoBodyOnly =
    cleanBodyWithoutTitle.length < 120 &&
    /(?:assista|vídeo|veja|confira|íntegra|reprodução|g1|ao vivo)/i.test(cleanBodyWithoutTitle);

  if (hasVideoTitle) {
    // É uma notícia com título de vídeo/telejornal e sem corpo jornalístico longo
    return true;
  }

  // Notícia com título genérico e corpo que é apenas pedido de "assista ao vídeo" ou quase vazio
  if (cleanBodyWithoutTitle.length < 60 && /(?:assista|vídeo|play|ao vivo|telejornal)/i.test(rawTitle + ' ' + cleanBodyWithoutTitle)) {
    return true;
  }

  return false;
}

/**
 * Detecta se uma matéria fala de "Bom dia", começa com "Bom dia",
 * ou tem "Bom dia" no título, descrição ou conteúdo.
 * Requisito estrito: "Remova desta api todas as notícias que fala de Bom dia ou começa com Bom dia ou tenha Bom dia no titulo ou no conteudo."
 */
export function hasBomDia(
  title?: string | null,
  content?: string | null,
  description?: string | null
): boolean {
  const bomDiaRegex = /\bbom[\s-]dia\b/i;

  const t = (title || '').trim();
  const c = (content || '').trim();
  const d = (description || '').trim();

  // 1. Título fala de Bom dia, começa com Bom dia ou tem Bom dia
  if (bomDiaRegex.test(t) || t.toLowerCase().includes('bom dia') || t.toLowerCase().includes('bom-dia')) {
    return true;
  }

  // 2. Conteúdo fala de Bom dia ou tem Bom dia
  if (bomDiaRegex.test(c) || c.toLowerCase().includes('bom dia') || c.toLowerCase().includes('bom-dia')) {
    return true;
  }

  // 3. Descrição fala de Bom dia ou tem Bom dia
  if (bomDiaRegex.test(d) || d.toLowerCase().includes('bom dia') || d.toLowerCase().includes('bom-dia')) {
    return true;
  }

  return false;
}

/**
 * Validador principal que decide se uma matéria pode ser retornada pela API:
 * 1. Remove qualquer matéria que fale de Bom dia ou tenha Bom dia no título ou conteúdo.
 * 2. Remove chamadas de vídeo/telejornal sem conteúdo jornalístico textual.
 */
export function isArticleAllowed(item: {
  title?: string | null;
  content?: string | null;
  description?: string | null;
}): boolean {
  if (hasBomDia(item.title, item.content, item.description)) {
    return false;
  }
  if (isVideoBroadcastWithoutContent(item.title, item.content, item.description)) {
    return false;
  }
  return true;
}

export function extractPostContextFromLink(link: string | undefined): { postSlug?: string; postTitle?: string } {
  if (!link) return {};
  try {
    const url = new URL(link);
    const pathname = url.pathname.replace(/\/+$/, '');
    const attachMatch = pathname.match(/(?:^|\/)([^/]+)\/attachment(?:\/|$)/i);
    let rawSlug = attachMatch ? attachMatch[1] : '';

    if (!rawSlug && !pathname.includes('/wp-content/') && !pathname.includes('/attachment/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        rawSlug = parts[parts.length - 1];
      }
    }

    if (rawSlug && rawSlug.length > 3 && rawSlug.includes('-')) {
      const words = rawSlug.split('-').filter(Boolean);
      if (words.length >= 2) {
        const postTitle = words
          .map((w, idx) => (idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
          .join(' ');
        return { postSlug: rawSlug, postTitle };
      }
    }
  } catch (e) {}
  return {};
}

export function stripHtmlToParagraphs(html: string | undefined | null): string {
  if (!html) return '';

  // 1. Proteger elementos de mídia (imagens, vídeos, áudios, iframes, links para arquivos) e URLs antes da remoção de tags comuns
  const { maskedText, restore } = protectMediaUrlsAndTags(html);

  let clean = maskedText
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|article|section)>/gi, '\n\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = clean.replace(/<!\[CDATA\[|\]\]>/g, '');
  try {
    clean = he.decode(clean);
  } catch (e) {}
  const paragraphs = clean
    .split(/\n+/)
    .map((p) => cleanText(p))
    .filter((p) => p.length > 0);

  return restore(paragraphs.join('\n\n'));
}

function stripHtmlAndClean(html: string | undefined | null): string {
  if (!html) return '';
  const textWithoutTags = html.replace(/<[^>]+>/g, ' ');
  return cleanText(textWithoutTags);
}

function extractTagValue(xml: string, tagName: string): string {
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch && cdataMatch[1] !== undefined) {
    return cleanText(cdataMatch[1]);
  }

  const standardRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(standardRegex);
  if (match && match[1] !== undefined) {
    const rawVal = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
    return cleanText(rawVal);
  }

  return '';
}

function extractAttribute(xml: string, tagName: string, attrName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*\\s+${attrName}=["']([^"']*)["'][^>]*>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

/**
 * Incorpora uma URL de imagem ao conteúdo da matéria caso ainda não esteja presente
 */
export function incorporateImageIntoContent(
  content: string | undefined | null,
  imageUrl: string | undefined | null,
  altText: string | undefined | null
): string {
  const currentContent = content || '';
  if (!imageUrl) return currentContent;

  const cleanUrl = imageUrl.trim();
  if (!cleanUrl) return currentContent;

  // Se o conteúdo já contém a URL desta imagem, mantém como está
  if (currentContent.includes(cleanUrl)) {
    return currentContent;
  }

  const cleanAlt = cleanText(altText || 'Imagem da notícia');
  const imgTag = `<p><img src="${cleanUrl}" alt="${cleanAlt}" /></p>\n\n`;

  return imgTag + currentContent;
}

/**
 * Deduplica imagens na mesma categoria e feed:
 * 1. Em caso de repetição de URL de imagem verificada entre as matérias do lote:
 *    - Incorpora ao conteúdo uma segunda imagem que contenha no conteúdo da notícia a fim de evitar imagens duplicadas no mesmo feed.
 *    - Somente em caso se não houver uma segunda imagem dentro da notícia, mantém e incorpora a mesma URL de imagem.
 * 2. Se for a primeira ocorrência, utiliza a imagem primária e a incorpora ao conteúdo.
 */
export function deduplicateFeedImages(items: ContentItem[], preserveAvailableImages: boolean = false): ContentItem[] {
  const seenImageUrls = new Set<string>();

  return items.map((item) => {
    const available = (item.availableImages || []).filter(
      (img) => Boolean(img) && !isGenericBanner(img)
    );

    // Candidata primária: imageUrl definida no parsing ou a primeira das imagens disponíveis
    const primaryImg = item.imageUrl || item.image || available[0];

    let chosenImage: string | undefined = undefined;

    if (primaryImg) {
      const normPrimary = primaryImg.trim().toLowerCase();

      if (seenImageUrls.has(normPrimary)) {
        // REPETIÇÃO DETECTADA NA MESMA CATEGORIA / FEED!
        // Buscar uma segunda imagem no conteúdo da notícia que ainda não tenha sido usada no feed
        const secondImage = available.find((img) => {
          const norm = img.trim().toLowerCase();
          return norm !== normPrimary && !seenImageUrls.has(norm);
        });

        if (secondImage) {
          // Encontrou segunda imagem diferente no conteúdo da matéria
          chosenImage = secondImage;
          seenImageUrls.add(secondImage.trim().toLowerCase());
        } else {
          // Somente se não houver segunda imagem dentro da notícia, mantém e incorpora a mesma URL de imagem
          chosenImage = primaryImg;
        }
      } else {
        // Primeira ocorrência da imagem no feed
        chosenImage = primaryImg;
        seenImageUrls.add(normPrimary);
      }
    }

    // Incorporar a imagem escolhida ao conteúdo da notícia
    const updatedContent = incorporateImageIntoContent(
      item.content || item.description,
      chosenImage,
      item.alt || item.title
    );

    const cleanItem = { ...item };
    if (!preserveAvailableImages) {
      delete cleanItem.availableImages;
    }

    const finalImg = chosenImage || item.imageUrl || item.image || undefined;

    return {
      ...cleanItem,
      imageUrl: finalImg,
      image: finalImg,
      content: updatedContent,
    };
  });
}

export const deduplicateImages = deduplicateFeedImages;

const GENERIC_REPEATED_BANNERS = [
  'copa-alem-da-copa-novo.jpeg',
  'copa-alem-da-copa',
  'default-thumbnail',
  'placeholder',
  'logo-padrao',
];

export function isGenericBanner(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return GENERIC_REPEATED_BANNERS.some((b) => lower.includes(b));
}

export function extractContentImages(html?: string | null): string[] {
  if (!html) return [];
  const results: string[] = [];
  const seen = new Set<string>();

  const addImg = (url: string | undefined | null) => {
    if (!url) return;
    const clean = url.trim().replace(/&amp;/g, '&');
    if (
      clean.startsWith('http') &&
      !clean.includes('avatar') &&
      !clean.includes('gravatar') &&
      !clean.includes('pixel') &&
      !clean.includes('emoji') &&
      !clean.includes('smilies') &&
      !clean.includes('w.org') &&
      !clean.includes('1x1') &&
      !clean.includes('s.w.org')
    ) {
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && !isGenericBanner(lower)) {
        seen.add(lower);
        results.push(clean);
      }
    }
  };

  // 1. Tags <img> completas
  const imgTagRegex = /<img\b([^>]*)\/?>/gi;
  let tagMatch;
  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const srcMatch = attrs.match(/\b(?:src|data-src|data-lazy-src|data-original|data-orig-file)=["']([^"']+)["']/i);
    if (srcMatch) {
      addImg(srcMatch[1]);
    }
    const srcsetMatch = attrs.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcsetMatch) {
      const firstSrc = srcsetMatch[1].split(',')[0]?.trim().split(/\s+/)[0];
      addImg(firstSrc);
    }
  }

  // 2. Links diretos para imagens no HTML
  const linkImgRegex = /<a\b[^>]*\bhref=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"']*)?)["']/gi;
  let linkMatch;
  while ((linkMatch = linkImgRegex.exec(html)) !== null) {
    addImg(linkMatch[1]);
  }

  return results;
}

export async function getLudopedioFeedMap(
  refererSite: string,
  signal?: AbortSignal,
  bypassCache: boolean = false
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const feedRes = await resilientFetch(
      'https://ludopedio.org.br/feed/',
      refererSite,
      false,
      signal,
      bypassCache
    );
    if (feedRes.ok) {
      const xml = await feedRes.text();
      const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
      for (const it of items) {
        const titleMatch = it.match(/<title>([\s\S]*?)<\/title>/i);
        const rawT = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';
        const itunes = it.match(/<itunes:image[^>]+href=["']([^"']+)["']/i)?.[1];
        const contentImg = it.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
        const img = itunes || contentImg;
        if (rawT && img) {
          const normKey = rawT
            .toLowerCase()
            .replace(/&#8211;/g, '-')
            .replace(/[–—]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
          map.set(normKey, img);
        }
      }
    }
  } catch {
    // gracefully continue
  }
  return map;
}

export function resolveBestPostImage(
  post: any,
  featuredMediaUrl?: string | null,
  feedImageMap?: Map<string, string>
): string | undefined {
  const rawTitle = cleanText(post.title?.rendered || post.title || '');
  const contentImages = extractContentImages(post.content?.rendered);
  const excerptImages = extractContentImages(post.excerpt?.rendered);
  const allContentImages = [...contentImages, ...excerptImages];

  // Specific content image that is not a generic repeating banner
  const specificContentImg = allContentImages.find((u) => !isGenericBanner(u));

  // Feed image matching title
  const normTitle = rawTitle
    .toLowerCase()
    .replace(/&#8211;/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const feedImg = feedImageMap?.get(normTitle);

  let candidate =
    post.jetpack_featured_media_url ||
    post.featured_media_src_url ||
    featuredMediaUrl ||
    undefined;

  if (isGenericBanner(candidate)) {
    candidate = specificContentImg || feedImg || allContentImages[0] || (candidate && !isGenericBanner(candidate) ? candidate : undefined);
  } else if (specificContentImg && !featuredMediaUrl) {
    candidate = specificContentImg;
  }

  if (feedImg && isGenericBanner(candidate)) {
    candidate = feedImg;
  }

  return candidate || undefined;
}

export function extractAllWordPressImages(
  post: any,
  featuredMediaUrl?: string | null,
  feedImageMap?: Map<string, string>
): string[] {
  const list: string[] = [];
  const seen = new Set<string>();

  const add = (u?: string | null) => {
    if (!u) return;
    const clean = u.trim();
    if (clean.startsWith('http')) {
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && !isGenericBanner(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    }
  };

  // 1. Melhor imagem calculada
  const best = resolveBestPostImage(post, featuredMediaUrl, feedImageMap);
  if (best) add(best);

  // 2. Featured media
  if (featuredMediaUrl) add(featuredMediaUrl);
  if (post.featured_media_src_url) add(post.featured_media_src_url);
  if (post.jetpack_featured_media_url) add(post.jetpack_featured_media_url);

  // 3. Imagens do conteúdo HTML
  for (const img of extractContentImages(post.content?.rendered)) add(img);

  // 4. Imagens do resumo HTML
  for (const img of extractContentImages(post.excerpt?.rendered)) add(img);

  // 5. Imagem mapeada do feed
  const rawTitle = cleanText(post.title?.rendered || post.title || '');
  const normTitle = rawTitle.toLowerCase().replace(/&#8211;/g, '-').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const feedImg = feedImageMap?.get(normTitle);
  if (feedImg) add(feedImg);

  return list;
}

export function extractAllRssImages(block: string, content?: string, description?: string): string[] {
  const list: string[] = [];
  const seen = new Set<string>();

  const add = (u?: string | null) => {
    if (!u) return;
    const clean = u.trim().replace(/&amp;/g, '&');
    if (clean.startsWith('http')) {
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && !isGenericBanner(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    }
  };

  // 1. itunes:image
  const itunesMatch = block.match(/<itunes:image\b[^>]+href=["']([^"']+)["']/i);
  if (itunesMatch) add(itunesMatch[1]);

  // 2. enclosures
  const encMatches = block.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi) || [];
  for (const enc of encMatches) {
    const url = enc.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (url) {
      add(url);
    }
  }

  // 3. media:content tags
  const mediaMatches = block.match(/<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi) || [];
  for (const m of mediaMatches) {
    const url = m.match(/\burl=["']([^"']+)["']/i)?.[1];
    add(url);
  }

  // 4. media:thumbnail tags
  const thumbMatches = block.match(/<media:thumbnail\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi) || [];
  for (const m of thumbMatches) {
    const url = m.match(/\burl=["']([^"']+)["']/i)?.[1];
    add(url);
  }

  // 5. atom:link enclosure
  const atomEncMatches = block.match(/<atom:link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi) || [];
  for (const atom of atomEncMatches) {
    if (/rel=["']enclosure["']/i.test(atom) || /type=["']image\//i.test(atom)) {
      const url = atom.match(/\bhref=["']([^"']+)["']/i)?.[1];
      add(url);
    }
  }

  // 6. Imagens dentro de tags <img> do próprio bloco XML (ex.: CDATA da description ou content)
  for (const img of extractContentImages(block)) add(img);

  // 7. Imagens dentro de content e description
  if (content) {
    for (const img of extractContentImages(content)) add(img);
  }
  if (description) {
    for (const img of extractContentImages(description)) add(img);
  }

  return list;
}

export function parseRssFeed(
  xml: string,
  defaultCategory?: string,
  defaultSourceId?: string | number
): { feed: any; items: ContentItem[] } {
  let feedTitle = extractTagValue(xml, 'title');
  if (feedTitle && feedTitle.trim().toLowerCase() === 'g1') {
    feedTitle = '';
  }

  const feed: any = {
    title: feedTitle,
    description: extractTagValue(xml, 'description'),
    language: extractTagValue(xml, 'language'),
    lastBuildDate: extractTagValue(xml, 'lastBuildDate') || extractTagValue(xml, 'pubDate'),
  };

  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const rawItems: ContentItem[] = itemBlocks.map((block, index) => {
    const rawTitle = extractTagValue(block, 'title');
    const title = cleanText(removeG1Sentences(rawTitle || ''));
    const link = extractTagValue(block, 'link') || extractTagValue(block, 'guid');
    const description = extractTagValue(block, 'description');
    const content = extractTagValue(block, 'content:encoded') || description;
    const pubDate = extractTagValue(block, 'pubDate');
    let author = extractTagValue(block, 'author') || extractTagValue(block, 'dc:creator');
    if (author && (/\bg1\b/i.test(author.trim()) || /^(por\s+)?g1$/i.test(author.trim()))) {
      author = '';
    }
    const guid = extractTagValue(block, 'guid') || String(index + 1);

    const catMatches = block.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
    const xmlCategories = catMatches
      .map((c) =>
        cleanText(
          c
            .replace(/<category[^>]*>/i, '')
            .replace(/<\/category>/i, '')
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        )
      )
      .filter((c) => Boolean(c) && !/\bg1\b/i.test(c.trim()));

    const effectiveCategory = xmlCategories.length > 0 ? xmlCategories[0] : (defaultCategory || 'Geral');
    const effectiveCategories = xmlCategories.length > 0 ? xmlCategories : (defaultCategory ? [defaultCategory] : ['Geral']);

    // Extrair todas as imagens disponíveis na notícia do feed
    const availableImages = extractAllRssImages(block, content, description);
    const imageUrl = availableImages[0] || undefined;

    const itemTitle = title || 'Sem título';
    const itemSlug = slugify(itemTitle);

    // ID numérico de 6 dígitos sem 0 conforme especificação
    const numericId = generate6DigitId(guid || link || itemTitle || String(index + 1));

    const cleanDesc = stripHtmlToParagraphs(description);
    const cleanContent = stripHtmlToParagraphs(content);
    const completeText = cleanContent && cleanContent.length > cleanDesc.length ? cleanContent : (cleanDesc || cleanContent || '');

    return {
      id: numericId,
      title: itemTitle,
      slug: itemSlug,
      alt: itemTitle,
      category: effectiveCategory,
      categories: effectiveCategories,
      source: defaultCategory || feedTitle || 'Notícias',
      sourceId: defaultSourceId || undefined,
      description: completeText,
      content: completeText,
      pubDate,
      author: author || undefined,
      imageUrl: imageUrl || undefined,
      image: imageUrl || undefined,
      availableImages,
    };
  })
  .filter((item) => isArticleAllowed(item));

  // Deduplica imagens no feed: preservamos availableImages para enriquecimento posterior
  const items = deduplicateFeedImages(rawItems, true);

  return { feed, items };
}

const fallbackAttemptedSources = new Set<string>();

/**
 * Resilient HTTP fetcher with multi-tier bypass against 403 Forbidden
 */
async function resilientFetch(
  url: string,
  site: string,
  isJson: boolean = true,
  signal?: AbortSignal,
  bypassCache: boolean = false
): Promise<Response> {
  let refererUrl: string;
  try {
    refererUrl = new URL(url).origin;
  } catch {
    refererUrl = site.startsWith('http') ? site : `https://${site}/`;
  }

  const standardHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': isJson ? 'application/json, text/plain, */*' : 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': refererUrl,
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };

  const fetchInit: RequestInit = bypassCache
    ? { headers: standardHeaders, signal, cache: 'no-store' }
    : {
        headers: standardHeaders,
        signal,
        next: { revalidate: 20, tags: ['news', 'sources', 'wordpress', 'content'] },
      };

  const res = await fetch(url, fetchInit);

  // Tentar o segundo e terceiro user-agent apenas quando o primeiro retornar 401, 403 ou 503, e no máximo uma vez por fonte
  const isTargetError = res.status === 401 || res.status === 403 || res.status === 503;
  const sourceKey = (site || refererUrl || url).toLowerCase();

  if (!isTargetError || fallbackAttemptedSources.has(sourceKey)) {
    return res;
  }

  if (fallbackAttemptedSources.size > 500) {
    fallbackAttemptedSources.clear();
  }
  fallbackAttemptedSources.add(sourceKey);

  // Tier 2: Googlebot News Crawler
  const crawlerHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': isJson ? 'application/json, */*' : 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': refererUrl,
  };

  const crawlerInit: RequestInit = bypassCache
    ? { headers: crawlerHeaders, signal, cache: 'no-store' }
    : {
        headers: crawlerHeaders,
        signal,
        next: { revalidate: 20, tags: ['news', 'sources', 'wordpress', 'content'] },
      };

  try {
    const res2 = await fetch(url, crawlerInit);

    if (res2.ok) {
      return res2;
    }

    // Tier 3: Facebook External Hit (apenas quando 401, 403 ou 503)
    if (res2.status === 401 || res2.status === 403 || res2.status === 503) {
      const fbHeaders: Record<string, string> = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': isJson ? 'application/json, */*' : '*/*',
        'Referer': refererUrl,
      };
      const res3 = await fetch(
        url,
        bypassCache
          ? { headers: fbHeaders, signal, cache: 'no-store' }
          : { headers: fbHeaders, signal, next: { revalidate: 20, tags: ['news', 'sources', 'wordpress', 'content'] } }
      );
      return res3;
    }

    return res2;
  } catch {
    return res;
  }
}

export async function fetchSourceContent(
  source: Source,
  options: FetchOptions = {}
): Promise<ContentResponse> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(30, Math.max(1, options.limit || 10));
  const search = options.search?.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  const bypassCache = Boolean(options.bypassCache);

  try {
    if (source.type === 'wp-api') {
      const urlObj = new URL(source.url);
      urlObj.searchParams.set('page', String(page));
      urlObj.searchParams.set('per_page', String(limit));
      urlObj.searchParams.set('_embed', 'wp:featuredmedia');
      if (search) {
        urlObj.searchParams.set('search', search);
      }

      let response: Response | undefined;
      let primaryError: any;
      try {
        response = await resilientFetch(urlObj.toString(), source.site, true, controller.signal, bypassCache);
      } catch (e: any) {
        primaryError = e;
      }

      // If WP-API failed or threw an error, attempt fallback to RSS feed
      if (primaryError || (response && !response.ok)) {
        const errorMsg = primaryError ? (primaryError.message || primaryError) : `HTTP ${response?.status}`;
        console.warn(`WP-API failed (${errorMsg}) for ${source.site}. Attempting fallback to RSS feed...`);
        const feedUrl = urlObj.origin + '/feed/';
        try {
          let feedRes = await resilientFetch(feedUrl, source.site, false, controller.signal);
          if (!feedRes.ok) {
            feedRes = await fetch(feedUrl, { signal: controller.signal });
          }
          if (feedRes.ok) {
            clearTimeout(timeoutId);
            const xmlText = await feedRes.text();
            const { feed, items: allItems } = parseRssFeed(xmlText, source.category, source.id);
            let filtered = allItems;
            if (search) {
              const lower = search.toLowerCase();
              filtered = allItems.filter(
                (i) => i.title.toLowerCase().includes(lower) || (i.description && i.description.toLowerCase().includes(lower))
              );
            }
            const total = filtered.length;
            const totalPages = Math.ceil(total / limit) || 1;
            const startIndex = (page - 1) * limit;
            const rawSlice = filtered.slice(startIndex, startIndex + limit);

            // Limpeza com IA para itens de feed RSS (apenas se AI_ENDPOINT e AI_API_KEY configurados)
            const hasAi = isAiConfigured();
            const cleanedSlice = await Promise.all(
              rawSlice.map(async (item) => {
                const rawContent = item.content || item.description || '';
                const preCleaned = preCleanText(rawContent);
                let cleanContent = preCleaned;
                if (hasAi) {
                  try {
                    cleanContent = await processarEConfigurarNoticia(preCleaned);
                  } catch {
                    cleanContent = preCleaned;
                  }
                }
                return {
                  ...item,
                  category: item.category || source.category,
                  categories: item.categories || (source.category ? [source.category] : ['Geral']),
                  source: item.source || source.category,
                  sourceId: item.sourceId || source.id,
                  description: item.description && item.description !== item.content
                    ? (cleanContent.length > 200 ? cleanContent.slice(0, 200) : cleanContent)
                    : cleanContent,
                  content: cleanContent,
                };
              })
            );

            const dedupedItems = deduplicateImages(cleanedSlice, false);

            return {
              source,
              feed,
              pagination: { total, page, limit, totalPages },
              items: dedupedItems,
            };
          }
        } catch (feedErr) {
          // ignore feed fallback error, continue to throw original status
        }

        clearTimeout(timeoutId);
        if (primaryError) {
          throw primaryError;
        } else if (response) {
          throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
        }
      }

      clearTimeout(timeoutId);

      const rawPosts = await response!.json();
      const totalHeader = response!.headers.get('x-wp-total');
      const totalPagesHeader = response!.headers.get('x-wp-totalpages');

      const total = totalHeader ? parseInt(totalHeader, 10) : Array.isArray(rawPosts) ? rawPosts.length : 0;
      const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(total / limit) || 1;

      let feedImageMap: Map<string, string> | undefined;
      if (source.url?.includes('ludopedio') || String(source.id) === '9124882157745') {
        feedImageMap = await getLudopedioFeedMap(source.site, controller.signal, bypassCache);
      }

      const items: ContentItem[] = Array.isArray(rawPosts)
        ? rawPosts
            .map((post: any) => {
              const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
              const rawTitle = cleanText(post.title?.rendered || post.title || 'Sem título');
              const title = removeG1Sentences(rawTitle);
              const slug = post.slug ? String(post.slug).trim() : slugify(title);

              const allAvailableImages = extractAllWordPressImages(post, featuredMedia, feedImageMap);
              const img = allAvailableImages[0] || resolveBestPostImage(post, featuredMedia, feedImageMap);

              const rawId = typeof post.id === 'number' ? post.id : parseInt(String(post.id), 10);
              const numericId = !isNaN(rawId) && rawId > 0 ? rawId : generate6DigitId(slug || title);

              const fullContentText = stripHtmlToParagraphs(post.content?.rendered);
              const excerptText = stripHtmlToParagraphs(post.excerpt?.rendered);
              const completeText = fullContentText && fullContentText.length > 50
                ? fullContentText
                : (excerptText || fullContentText || '');

              const cleanedContent = preCleanText(completeText || '');
              const cleanedDescription = excerptText && excerptText !== completeText
                ? (cleanedContent.length > 200 ? cleanedContent.slice(0, 200) : cleanedContent)
                : cleanedContent;

              return {
                id: numericId,
                title,
                slug,
                alt: title,
                category: source.category,
                categories: [source.category],
                source: source.category,
                sourceId: source.id,
                description: cleanedDescription,
                content: cleanedContent,
                pubDate: post.date || post.date_gmt,
                author: post.author ? String(post.author) : undefined,
                imageUrl: img || undefined,
                image: img || undefined,
                availableImages: allAvailableImages,
              };
            })
            .filter((item) => isArticleAllowed(item))
        : [];

      const dedupedItems = deduplicateFeedImages(items, false);

      return {
        source,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        items: dedupedItems,
      };
    } else {
      // RSS Feed source
      const response = await resilientFetch(source.url, source.site, false, controller.signal, bypassCache);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const { feed, items: allItems } = parseRssFeed(xmlText, source.category, source.id);

      let filteredItems = allItems;
      if (search) {
        const lowerSearch = search.toLowerCase();
        filteredItems = allItems.filter(
          (item) =>
            item.title.toLowerCase().includes(lowerSearch) ||
            (item.description && item.description.toLowerCase().includes(lowerSearch))
        );
      }

      const total = filteredItems.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

      // Processar e limpar notícias de feed RSS com a IA (apenas se AI_ENDPOINT e AI_API_KEY configurados)
      const hasAi = isAiConfigured();
      const itemsWithAiClean = await Promise.all(
        paginatedItems.map(async (item) => {
          const rawContent = item.content || item.description || '';
          const preCleaned = preCleanText(rawContent);
          let cleanContent = preCleaned;
          if (hasAi) {
            try {
              cleanContent = await processarEConfigurarNoticia(preCleaned);
            } catch {
              cleanContent = preCleaned;
            }
          }
          return {
            ...item,
            category: item.category || source.category,
            categories: item.categories || (source.category ? [source.category] : ['Geral']),
            source: item.source || source.category,
            sourceId: item.sourceId || source.id,
            description: item.description && item.description !== item.content
              ? (cleanContent.length > 200 ? cleanContent.slice(0, 200) : cleanContent)
              : cleanContent,
            content: cleanContent,
          };
        })
      );

      const validAiItems = itemsWithAiClean.filter(
        (item) => !isVideoBroadcastWithoutContent(item.title, item.content, item.description)
      );

      // Deduplica imagens e incorpora <p><img src="..." /></p> diretamente ao conteúdo APÓS a limpeza de texto
      const dedupedItems = deduplicateImages(validAiItems, false);

      return {
        source,
        feed,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        items: dedupedItems,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to fetch content from ${source.site}: ${err.message || err}`);
  }
}

export async function fetchMediaContent(
  mediaSource: Source,
  options: FetchOptions = {}
): Promise<ContentResponse> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(30, Math.max(1, options.limit || 10));
  const search = options.search?.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);
  const bypassCache = Boolean(options.bypassCache);

  try {
    if (mediaSource.type === 'rss') {
      const feedData = await fetchSourceContent(mediaSource, { page: 1, limit: 30, search, bypassCache });
      clearTimeout(timeoutId);

      const mediaCandidates: ContentItem[] = feedData.items
        .filter((item) => Boolean(item.imageUrl || item.image) && isArticleAllowed(item))
        .map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug || slugify(item.title),
          alt: item.title,
          category: item.category || mediaSource.category,
          categories: item.categories || [mediaSource.category],
          source: item.source || mediaSource.category,
          sourceId: item.sourceId || mediaSource.id,
          description: item.description,
          content: item.content || item.description,
          pubDate: item.pubDate,
          imageUrl: item.imageUrl || item.image,
          image: item.imageUrl || item.image,
          availableImages: item.availableImages,
        }));

      const uniqueRssMediaItems = deduplicateFeedImages(mediaCandidates, false);

      const total = uniqueRssMediaItems.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;

      return {
        source: mediaSource,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        items: uniqueRssMediaItems.slice(startIndex, startIndex + limit),
      };
    }

    // WordPress sources
    const targetUrl = mediaSource.url.replace(/\/media\/?$/, '/posts');
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set('page', String(page));
    urlObj.searchParams.set('per_page', String(limit));
    urlObj.searchParams.set('_embed', 'wp:featuredmedia');
    if (search) {
      urlObj.searchParams.set('search', search);
    }

    let response: Response | undefined;
    let primaryError: any;
    try {
      response = await resilientFetch(urlObj.toString(), mediaSource.site, true, controller.signal, bypassCache);
    } catch (e: any) {
      primaryError = e;
    }

    if (primaryError || (response && !response.ok)) {
      const errorMsg = primaryError ? (primaryError.message || primaryError) : `HTTP ${response?.status}`;
      console.warn(`WP-API Posts for media failed (${errorMsg}) for ${mediaSource.site}. Attempting fallback to RSS feed for media...`);
      const feedUrl = urlObj.origin + '/feed/';
      try {
        let feedRes = await resilientFetch(feedUrl, mediaSource.site, false, controller.signal);
        if (!feedRes.ok) {
          feedRes = await fetch(feedUrl, { signal: controller.signal });
        }
        if (feedRes.ok) {
          clearTimeout(timeoutId);
          const xmlText = await feedRes.text();
          const { items: allItems } = parseRssFeed(xmlText);

          const uniqueFallbackItems: ContentItem[] = [];
          const seenFallbackImages = new Set<string>();

          for (const item of allItems) {
            if (item.imageUrl) {
              const norm = item.imageUrl.trim().toLowerCase();
              if (!seenFallbackImages.has(norm)) {
                seenFallbackImages.add(norm);
                uniqueFallbackItems.push({
                  id: item.id,
                  title: item.title,
                  slug: item.slug || slugify(item.title),
                  alt: item.title,
                  description: item.description,
                  content: item.content || item.description,
                  pubDate: item.pubDate,
                  imageUrl: item.imageUrl,
                });
              }
            }
          }

          let mediaItems = uniqueFallbackItems;
          if (search) {
            const lowerSearch = search.toLowerCase();
            mediaItems = mediaItems.filter(
              (item) => item.title.toLowerCase().includes(lowerSearch) || (item.description && item.description.toLowerCase().includes(lowerSearch))
            );
          }
          const total = mediaItems.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const startIndex = (page - 1) * limit;
          return {
            source: mediaSource,
            pagination: { total, page, limit, totalPages },
            items: mediaItems.slice(startIndex, startIndex + limit),
          };
        }
      } catch (feedErr) {
        // ignore feed fallback error
      }

      clearTimeout(timeoutId);
      if (primaryError) {
        throw primaryError;
      } else if (response) {
        throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
      }
    }

    clearTimeout(timeoutId);

    const rawPosts = await response!.json();
    const totalHeader = response!.headers.get('x-wp-total');
    const totalPagesHeader = response!.headers.get('x-wp-totalpages');

    const total = totalHeader ? parseInt(totalHeader, 10) : Array.isArray(rawPosts) ? rawPosts.length : 0;
    const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(total / limit) || 1;

    let feedImageMap: Map<string, string> | undefined;
    if (mediaSource.url?.includes('ludopedio') || String(mediaSource.id) === '9124882157745') {
      feedImageMap = await getLudopedioFeedMap(mediaSource.site, controller.signal, bypassCache);
    }

    const items: ContentItem[] = Array.isArray(rawPosts)
      ? rawPosts
          .map((post: any) => {
            const newsTitle = cleanText(post.title?.rendered || post.title || 'Sem título');
            const newsSlug = post.slug ? String(post.slug).trim() : slugify(newsTitle);
            const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;

            const allAvailableImages = extractAllWordPressImages(post, featuredMedia, feedImageMap);
            const imageUrl = allAvailableImages[0] || resolveBestPostImage(post, featuredMedia, feedImageMap);

            const rawId = typeof post.id === 'number' ? post.id : parseInt(String(post.id), 10);
            const numericId = !isNaN(rawId) && rawId > 0 ? rawId : generate6DigitId(newsSlug || newsTitle);

            const fullContentText = stripHtmlToParagraphs(post.content?.rendered);
            const excerptText = stripHtmlToParagraphs(post.excerpt?.rendered || featuredMedia?.caption?.rendered || '');
            const completeText = fullContentText && fullContentText.length > 50
              ? fullContentText
              : (excerptText || fullContentText || '');

            return {
              id: numericId,
              title: newsTitle,
              slug: newsSlug, // slug da matéria
              alt: newsTitle, // alt com o título da matéria
              category: mediaSource.category,
              categories: [mediaSource.category],
              source: mediaSource.category,
              sourceId: mediaSource.id,
              description: completeText,
              content: completeText,
              pubDate: post.date || post.date_gmt,
              imageUrl: imageUrl || undefined,
              image: imageUrl || undefined,
              availableImages: allAvailableImages,
            };
          })
          .filter((item) => Boolean(item.imageUrl || item.image) && isArticleAllowed(item))
      : [];

    // Deduplica imagens no feed: em repetição, utiliza segunda imagem do conteúdo e incorpora; se não houver segunda, mantém a mesma URL
    const uniqueMediaItems = deduplicateFeedImages(items, false);

    return {
      source: mediaSource,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      items: uniqueMediaItems,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to fetch media content from ${mediaSource.site}: ${err.message || err}`);
  }
}

