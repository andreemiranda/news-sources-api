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
    id: string;
    category: string;
    site: string;
    type: string;
    url: string;
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

function extractTagValue(xml: string, tagName: string): string {
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch && cdataMatch[1] !== undefined) {
    return cdataMatch[1].trim();
  }

  const standardRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(standardRegex);
  if (match && match[1] !== undefined) {
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
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

    // Categories
    const catMatches = block.match(/<category[^>]*>([\s\S]*?)<\/category>/gi) || [];
    const categories = catMatches.map((c) =>
      c.replace(/<category[^>]*>/i, '').replace(/<\/category>/i, '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim()
    );

    // Media / Image
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
      title,
      link,
      description: description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      content,
      pubDate,
      author,
      categories: categories.length > 0 ? categories : undefined,
      imageUrl: imageUrl || undefined,
    };
  });

  return { feed, items };
}

export async function fetchSourceContent(
  source: Source,
  options: FetchOptions = {}
): Promise<ContentResponse> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const search = options.search?.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': source.type === 'wp-api' ? 'application/json, text/plain, */*' : 'application/xml, text/xml, application/rss+xml, */*',
  };

  try {
    if (source.type === 'wp-api') {
      const urlObj = new URL(source.url);
      urlObj.searchParams.set('page', String(page));
      urlObj.searchParams.set('per_page', String(limit));
      if (search) {
        urlObj.searchParams.set('search', search);
      }

      const response = await fetch(urlObj.toString(), {
        headers,
        signal: controller.signal,
        next: { revalidate: 300 }, // 5 min cache
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
      }

      const rawPosts = await response.json();
      const totalHeader = response.headers.get('x-wp-total');
      const totalPagesHeader = response.headers.get('x-wp-totalpages');

      const total = totalHeader ? parseInt(totalHeader, 10) : Array.isArray(rawPosts) ? rawPosts.length : 0;
      const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(total / limit) || 1;

      const items: ContentItem[] = Array.isArray(rawPosts)
        ? rawPosts.map((post: any) => {
            const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
            return {
              id: post.id,
              title: post.title?.rendered || post.title || 'Sem título',
              link: post.link || '',
              description: post.excerpt?.rendered ? post.excerpt.rendered.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '',
              content: post.content?.rendered || '',
              pubDate: post.date || post.date_gmt,
              author: post.author ? String(post.author) : undefined,
              imageUrl: post.jetpack_featured_media_url || featuredMedia || undefined,
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
      // RSS Feed
      const response = await fetch(source.url, {
        headers,
        signal: controller.signal,
        next: { revalidate: 300 },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const { feed, items: allItems } = parseRssFeed(xmlText);

      // Search filter if provided
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
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };

  try {
    const urlObj = new URL(mediaSource.url);
    urlObj.searchParams.set('page', String(page));
    urlObj.searchParams.set('per_page', String(limit));
    if (search) {
      urlObj.searchParams.set('search', search);
    }

    const response = await fetch(urlObj.toString(), {
      headers,
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upstream returned HTTP ${response.status}: ${response.statusText}`);
    }

    const rawMedia = await response.json();
    const totalHeader = response.headers.get('x-wp-total');
    const totalPagesHeader = response.headers.get('x-wp-totalpages');

    const total = totalHeader ? parseInt(totalHeader, 10) : Array.isArray(rawMedia) ? rawMedia.length : 0;
    const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(total / limit) || 1;

    const items: ContentItem[] = Array.isArray(rawMedia)
      ? rawMedia.map((m: any) => {
          return {
            id: m.id,
            title: m.title?.rendered || m.title || m.slug || 'Mídia',
            link: m.link || m.source_url || '',
            description: m.caption?.rendered ? m.caption.rendered.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : m.alt_text || '',
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
