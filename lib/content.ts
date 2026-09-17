import he from 'he';
import { Source } from './sources';

export interface ContentItem {
  id?: string | number;
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
  imageUrl?: string;
  mediaUrl?: string;
  raw?: any;
}

export interface ContentResponse {
  source: {
    id: number;
    category: string;
    site: string;
    type: string;
    url: string;
    mediaUrl?: string;
    active: boolean;
  };
  feed?: {
    title?: string;
    description?: string;
    link?: string;
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

export function parseRssFeed(xml: string): { feed: any; items: ContentItem[] } {
  const feed: any = {
    title: extractTagValue(xml, 'title'),
    description: extractTagValue(xml, 'description'),
    link: extractTagValue(xml, 'link'),
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
    const author = extractTagValue(block, 'author') || extractTagValue(block, 'dc:creator');
    const guid = extractTagValue(block, 'guid') || String(index + 1);

    const catMatches = block.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
    const categories = catMatches.map((c) =>
      cleanText(
        c
          .replace(/<category[^>]*>/i, '')
          .replace(/<\/category>/i, '')
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      )
    ).filter(Boolean);

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

    return {
      id: guid,
      title: title || 'Sem título',
      link,
      description: stripHtmlAndClean(description),
      content,
      pubDate,
      author: author || undefined,
      categories: categories.length > 0 ? categories : undefined,
      imageUrl: imageUrl || undefined,
      mediaUrl: imageUrl || undefined,
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

  // Tier 1: Modern Chrome 131 Desktop headers with legitimate client hints
  const standardHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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

    // If 403 Forbidden or 401 Unauthorized or 503, proceed to Tier 2
    if (res.status === 403 || res.status === 401 || res.status === 503) {
      console.warn(`Upstream returned HTTP ${res.status} for ${url}. Attempting crawler bypass...`);
    } else {
      return res;
    }
  } catch (err) {
    console.warn(`Primary fetch failed for ${url}:`, err);
  }

  // Tier 2: Googlebot News Crawler / Verified Web crawler headers
  // Almost all WordPress firewalls (Cloudflare, Wordfence, Sucuri, iThemes) whitelist Googlebot
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

    // Tier 3: Facebook External Hit / Social preview crawler
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
            // Fallback: simple fetch if resilientFetch is blocked
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
            return {
              source,
              feed,
              pagination: { total, page, limit, totalPages },
              items: filtered.slice(startIndex, startIndex + limit),
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

      // If we reach here, we have a successful WP-API response
      clearTimeout(timeoutId);

      // We assert response is defined because we handled !response.ok above
      const rawPosts = await response!.json();
      const totalHeader = response!.headers.get('x-wp-total');
      const totalPagesHeader = response!.headers.get('x-wp-totalpages');

      const total = totalHeader ? parseInt(totalHeader, 10) : Array.isArray(rawPosts) ? rawPosts.length : 0;
      const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(total / limit) || 1;

      const items: ContentItem[] = Array.isArray(rawPosts)
        ? rawPosts.map((post: any) => {
            const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            return {
              id: post.id,
              title: cleanText(post.title?.rendered || post.title || 'Sem título'),
              link: post.link || '',
              description: stripHtmlAndClean(post.excerpt?.rendered),
              content: post.content?.rendered || '',
              pubDate: post.date || post.date_gmt,
              author: post.author ? String(post.author) : undefined,
              imageUrl: post.jetpack_featured_media_url || featuredMedia || undefined,
              mediaUrl: post.jetpack_featured_media_url || featuredMedia || undefined,
              raw: options.raw ? post : undefined,
            };
          })
        : [];

      return {
        source,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        items,
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

      return {
        source,
        feed,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        items: paginatedItems,
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
    // If it's an RSS feed, we can fetch items and return items with media/images
    if (mediaSource.type === 'rss') {
      const feedData = await fetchSourceContent(mediaSource, { page: 1, limit: 100, search, raw: options.raw });
      clearTimeout(timeoutId);
      const mediaItems: ContentItem[] = feedData.items
        .filter((item) => Boolean(item.imageUrl))
        .map((item) => ({
          id: item.id,
          title: item.title,
          link: item.link,
          description: item.description,
          pubDate: item.pubDate,
          imageUrl: item.imageUrl,
          mediaUrl: item.imageUrl,
          raw: item.raw,
        }));
      const total = mediaItems.length;
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
        items: mediaItems.slice(startIndex, startIndex + limit),
      };
    }

    // WordPress Media API
    const targetUrl = mediaSource.mediaUrl || mediaSource.url.replace(/\/posts\/?$/, '/media');
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set('page', String(page));
    urlObj.searchParams.set('per_page', String(limit));
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
      console.warn(`WP-API Media failed (${errorMsg}) for ${mediaSource.site}. Attempting fallback to RSS feed for media...`);
      const feedUrl = urlObj.origin + '/feed/';
      try {
        let feedRes = await resilientFetch(feedUrl, mediaSource.site, false, controller.signal);
        if (!feedRes.ok) {
          // Fallback: simple fetch if resilientFetch is blocked
          feedRes = await fetch(feedUrl, { signal: controller.signal });
        }
        if (feedRes.ok) {
          clearTimeout(timeoutId);
          const xmlText = await feedRes.text();
          const { items: allItems } = parseRssFeed(xmlText);
          let mediaItems: ContentItem[] = allItems
            .filter((item) => Boolean(item.imageUrl))
            .map((item) => ({
              id: item.id,
              title: item.title,
              link: item.link,
              description: item.description,
              pubDate: item.pubDate,
              imageUrl: item.imageUrl,
              mediaUrl: item.imageUrl,
              raw: item.raw,
            }));
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
        // ignore feed fallback error, continue to throw original error
      }
      
      clearTimeout(timeoutId);
      if (primaryError) {
        throw primaryError;
      } else if (response) {
        throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
      }
    }

    clearTimeout(timeoutId);

    const rawMedia = await response!.json();
    const totalHeader = response!.headers.get('x-wp-total');
    const totalPagesHeader = response!.headers.get('x-wp-totalpages');

    const total = totalHeader ? parseInt(totalHeader, 10) : Array.isArray(rawMedia) ? rawMedia.length : 0;
    const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(total / limit) || 1;

    const items: ContentItem[] = Array.isArray(rawMedia)
      ? rawMedia.map((m: any) => {
          return {
            id: m.id,
            title: cleanText(m.title?.rendered || m.title || m.slug || 'Mídia'),
            link: m.link || m.source_url || '',
            description: m.caption?.rendered ? stripHtmlAndClean(m.caption.rendered) : cleanText(m.alt_text || ''),
            pubDate: m.date || m.date_gmt,
            imageUrl: m.source_url || m.guid?.rendered || undefined,
            mediaUrl: m.source_url || m.guid?.rendered || undefined,
            raw: options.raw ? m : {
              mime_type: m.mime_type,
              media_type: m.media_type,
              alt_text: m.alt_text,
              media_details: m.media_details ? {
                width: m.media_details.width,
                height: m.media_details.height,
                file: m.media_details.file,
                sizes: m.media_details.sizes,
              } : undefined,
            },
          };
        })
      : [];

    return {
      source: mediaSource,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      items,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(`Failed to fetch media content from ${mediaSource.site}: ${err.message || err}`);
  }
}
