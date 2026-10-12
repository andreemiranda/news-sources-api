import he from 'he';
import { Source, generate6DigitId } from './sources';
import { processarEConfigurarNoticia, preCleanText } from './ai-cleaner';

export interface ContentItem {
  id: number;
  title: string;
  slug: string;
  alt: string;
  description?: string;
  content?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
  imageUrl?: string;
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
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|article|section)>/gi, '\n\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<[^>]+>/g, ' ');
  try {
    clean = he.decode(clean);
  } catch (e) {}
  const paragraphs = clean
    .split(/\n+/)
    .map((p) => cleanText(p))
    .filter((p) => p.length > 0);
  return paragraphs.join('\n\n');
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
 * Deduplica URLs de imagens entre as notícias do lote para garantir que cada notícia
 * possua sua imagem única proveniente da API, eliminando repetições.
 */
export function deduplicateImages(items: ContentItem[]): ContentItem[] {
  const seenImages = new Set<string>();
  return items.map((item) => {
    if (!item.imageUrl) return item;
    const normalizedUrl = item.imageUrl.trim().toLowerCase();
    if (seenImages.has(normalizedUrl)) {
      // Já utilizada por outra matéria neste mesmo endpoint: remove repetição
      return {
        ...item,
        imageUrl: undefined,
      };
    }
    seenImages.add(normalizedUrl);
    return item;
  });
}

export function parseRssFeed(xml: string): { feed: any; items: ContentItem[] } {
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
  const items: ContentItem[] = itemBlocks.map((block, index) => {
    const title = extractTagValue(block, 'title');
    const link = extractTagValue(block, 'link') || extractTagValue(block, 'guid');
    const description = extractTagValue(block, 'description');
    const content = extractTagValue(block, 'content:encoded') || description;
    const pubDate = extractTagValue(block, 'pubDate');
    let author = extractTagValue(block, 'author') || extractTagValue(block, 'dc:creator');
    if (author && /^(por\s+)?g1$/i.test(author.trim())) {
      author = '';
    }
    const guid = extractTagValue(block, 'guid') || String(index + 1);

    const catMatches = block.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
    const categories = catMatches
      .map((c) =>
        cleanText(
          c
            .replace(/<category[^>]*>/i, '')
            .replace(/<\/category>/i, '')
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        )
      )
      .filter((c) => Boolean(c) && c.trim().toLowerCase() !== 'g1');

    let imageUrl = extractAttribute(block, 'enclosure', 'url');
    if (!imageUrl) {
      imageUrl = extractAttribute(block, 'media:content', 'url');
    }
    if (!imageUrl) {
      imageUrl = extractAttribute(block, 'media:thumbnail', 'url');
    }
    if (!imageUrl && description) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }

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
      description: completeText,
      content: completeText,
      pubDate,
      author: author || undefined,
      categories: categories.length > 0 ? categories : undefined,
      imageUrl: imageUrl || undefined,
    };
  });

  return { feed, items };
}

/**
 * Resilient HTTP fetcher with multi-tier bypass against 403 Forbidden
 */
async function resilientFetch(
  url: string,
  site: string,
  isJson: boolean = true,
  signal?: AbortSignal
): Promise<Response> {
  const refererUrl = site.startsWith('http') ? site : `https://${site}/`;

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

  try {
    const res = await fetch(url, {
      headers: standardHeaders,
      signal,
      cache: 'no-store',
    });

    if (res.ok) {
      return res;
    }

    if (res.status === 403 || res.status === 401 || res.status === 503) {
      console.warn(`Upstream returned HTTP ${res.status} for ${url}. Attempting crawler bypass...`);
    } else {
      return res;
    }
  } catch (err) {
    console.warn(`Primary fetch failed for ${url}:`, err);
  }

  // Tier 2: Googlebot News Crawler
  const crawlerHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': isJson ? 'application/json, */*' : 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': refererUrl,
  };

  try {
    const res2 = await fetch(url, {
      headers: crawlerHeaders,
      signal,
      cache: 'no-store',
    });

    if (res2.ok) {
      return res2;
    }

    // Tier 3: Facebook External Hit
    if (res2.status === 403 || res2.status === 401 || res2.status === 503) {
      const res3 = await fetch(url, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': isJson ? 'application/json, */*' : '*/*',
          'Referer': refererUrl,
        },
        signal,
        cache: 'no-store',
      });
      return res3;
    }

    return res2;
  } catch (err: any) {
    throw new Error(`Fetch failed after all retry attempts for ${url}: ${err.message || err}`);
  }
}

export async function fetchSourceContent(
  source: Source,
  options: FetchOptions = {}
): Promise<ContentResponse> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const search = options.search?.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

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
        response = await resilientFetch(urlObj.toString(), source.site, true, controller.signal);
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
            const { feed, items: allItems } = parseRssFeed(xmlText);
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

            // Limpeza com IA para itens de feed RSS
            const cleanedSlice = await Promise.all(
              rawSlice.map(async (item) => {
                let cleanContent = item.content || item.description || '';
                try {
                  cleanContent = await processarEConfigurarNoticia(cleanContent);
                } catch {
                  cleanContent = preCleanText(cleanContent);
                }
                return {
                  ...item,
                  description: preCleanText(item.description || ''),
                  content: cleanContent,
                };
              })
            );

            const dedupedItems = deduplicateImages(cleanedSlice);

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

      const items: ContentItem[] = Array.isArray(rawPosts)
        ? rawPosts.map((post: any) => {
            const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            const title = cleanText(post.title?.rendered || post.title || 'Sem título');
            const slug = post.slug ? String(post.slug).trim() : slugify(title);

            let img = post.jetpack_featured_media_url || featuredMedia;
            if (!img && post.content?.rendered) {
              const m = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (m) img = m[1];
            }
            if (!img && post.excerpt?.rendered) {
              const m = post.excerpt.rendered.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (m) img = m[1];
            }

            const rawId = typeof post.id === 'number' ? post.id : parseInt(String(post.id), 10);
            const numericId = !isNaN(rawId) && rawId > 0 ? rawId : generate6DigitId(slug || title);

            const fullContentText = stripHtmlToParagraphs(post.content?.rendered);
            const excerptText = stripHtmlToParagraphs(post.excerpt?.rendered);
            const completeText = fullContentText && fullContentText.length > 50
              ? fullContentText
              : (excerptText || fullContentText || '');

            return {
              id: numericId,
              title,
              slug,
              alt: title,
              description: completeText,
              content: completeText,
              pubDate: post.date || post.date_gmt,
              author: post.author ? String(post.author) : undefined,
              imageUrl: img || undefined,
            };
          })
        : [];

      const dedupedItems = deduplicateImages(items);

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
      const response = await resilientFetch(source.url, source.site, false, controller.signal);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const { feed, items: allItems } = parseRssFeed(xmlText);

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

      // Processar e limpar notícias de feed RSS com a IA (Pollinations / privada)
      const itemsWithAiClean = await Promise.all(
        paginatedItems.map(async (item) => {
          let cleanContent = item.content || item.description || '';
          try {
            cleanContent = await processarEConfigurarNoticia(cleanContent);
          } catch {
            cleanContent = preCleanText(cleanContent);
          }
          return {
            ...item,
            description: preCleanText(item.description || ''),
            content: cleanContent,
          };
        })
      );

      const dedupedItems = deduplicateImages(itemsWithAiClean);

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
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const search = options.search?.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    if (mediaSource.type === 'rss') {
      const feedData = await fetchSourceContent(mediaSource, { page: 1, limit: 100, search });
      clearTimeout(timeoutId);

      const uniqueRssMediaItems: ContentItem[] = [];
      const seenRssImages = new Set<string>();

      for (const item of feedData.items) {
        if (item.imageUrl) {
          const norm = item.imageUrl.trim().toLowerCase();
          if (!seenRssImages.has(norm)) {
            seenRssImages.add(norm);
            uniqueRssMediaItems.push({
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
      response = await resilientFetch(urlObj.toString(), mediaSource.site, true, controller.signal);
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

    const items: ContentItem[] = Array.isArray(rawPosts)
      ? rawPosts
          .map((post: any) => {
            const newsTitle = cleanText(post.title?.rendered || post.title || 'Sem título');
            const newsSlug = post.slug ? String(post.slug).trim() : slugify(newsTitle);
            const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
            let imageUrl = featuredMedia?.source_url || post.jetpack_featured_media_url || post.featured_media_src_url;

            if (!imageUrl && post.content?.rendered) {
              const match = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (match) imageUrl = match[1];
            }
            if (!imageUrl && post.excerpt?.rendered) {
              const match = post.excerpt.rendered.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (match) imageUrl = match[1];
            }

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
              description: completeText,
              content: completeText,
              pubDate: post.date || post.date_gmt,
              imageUrl: imageUrl || undefined,
            };
          })
          .filter((item) => Boolean(item.imageUrl))
      : [];

    // Eliminar repetições de imagens no mesmo endpoint para garantir imagem única por notícia
    const uniqueMediaItems: ContentItem[] = [];
    const seenImages = new Set<string>();

    for (const item of items) {
      if (item.imageUrl) {
        const norm = item.imageUrl.trim().toLowerCase();
        if (!seenImages.has(norm)) {
          seenImages.add(norm);
          uniqueMediaItems.push(item);
        }
      }
    }

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
