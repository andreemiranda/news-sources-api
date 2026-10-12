export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { getAllMediaSources, getMediaSourceById, getBaseUrl } from '@/lib/sources';
import { fetchMediaContent } from '@/lib/content';
import { toCleanSource, paginateWithHateoas } from '@/lib/hateoas';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const idParam = url.searchParams.get('id');
  const baseUrl = getBaseUrl(req);
  const format = url.searchParams.get('format');

  // Se ?id= for passado diretamente em /api/images
  if (idParam) {
    const source = getMediaSourceById(idParam);
    if (!source) {
      return NextResponse.json(
        { success: false, error: `Image source with id '${idParam}' not found.` },
        { status: 404 }
      );
    }
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
    const limit = parseInt(limitParam, 10);
    const search = url.searchParams.get('search') || undefined;

    try {
      const data = await fetchMediaContent(source, { page, limit, search });

      const itemsWithHateoas = data.items.map((item) => ({
        ...item,
        _links: {
          self: { href: `${baseUrl}/api/images/${source.id}?page=${page}` },
          news: { href: `${baseUrl}/api/news/${source.id}` },
          source: { href: `${baseUrl}/api/images/${source.id}` },
        },
      }));

      const hateoasResult = paginateWithHateoas(
        itemsWithHateoas,
        data.pagination.total,
        data.pagination.page,
        data.pagination.limit,
        `${baseUrl}/api/images/${source.id}`,
        { search },
        {
          images: { href: `${baseUrl}/api/images` },
          news: { href: `${baseUrl}/api/news/${source.id}` },
        }
      );

      const headers: Record<string, string> = {
        'X-WP-Total': data.pagination.total.toString(),
        'X-WP-TotalPages': data.pagination.totalPages.toString(),
      };

      if (format === 'array') {
        return NextResponse.json(hateoasResult.items, { headers });
      }

      return NextResponse.json(hateoasResult, { headers });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message, sourceId: source.id },
        { status: 502 }
      );
    }
  }

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
  const limit = parseInt(limitParam, 10);
  const activeParam = url.searchParams.get('active');
  let sources = getAllMediaSources();

  if (activeParam !== null && activeParam !== undefined && activeParam !== '') {
    const isActive = activeParam.toLowerCase() === 'true';
    sources = sources.filter((s) => s.active === isActive);
  }

  const cleanSources = sources.map((s) => toCleanSource(s, baseUrl));

  const total = cleanSources.length;
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.max(1, limit || 100);
  const startIndex = (safePage - 1) * safeLimit;
  const pagedItems = cleanSources.slice(startIndex, startIndex + safeLimit);

  const hateoasResult = paginateWithHateoas(
    pagedItems,
    total,
    safePage,
    safeLimit,
    `${baseUrl}/api/images`,
    {
      active: activeParam || undefined,
    },
    {
      news: { href: `${baseUrl}/api/news` },
      categories: { href: `${baseUrl}/api/categories` },
      stats: { href: `${baseUrl}/api/stats` },
    }
  );

  const headers = {
    'X-WP-Total': hateoasResult.meta.totalItems.toString(),
    'X-WP-TotalPages': hateoasResult.meta.totalPages.toString(),
  };

  if (format === 'array') {
    return NextResponse.json(hateoasResult.items, { headers });
  }

  return NextResponse.json(hateoasResult, { headers });
}
