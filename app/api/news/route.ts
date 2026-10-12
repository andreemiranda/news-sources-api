export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAllSources, getSourcesByCategory, getBaseUrl } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { toCleanSource, paginateWithHateoas } from '@/lib/hateoas';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
  const limit = parseInt(limitParam, 10);
  const category = url.searchParams.get('category');
  const active = url.searchParams.get('active');
  const type = url.searchParams.get('type');
  const format = url.searchParams.get('format');

  let sources = getAllSources();

  if (category) {
    sources = getSourcesByCategory(category);
  }

  if (type) {
    sources = sources.filter((s) => s.type === type);
  }

  if (active !== null && active !== undefined && active !== '') {
    const isActive = active === 'true';
    sources = sources.filter((s) => s.active === isActive);
  }

  const baseUrl = getBaseUrl(req);

  // Mapear fontes limpando estritamente tags de backend (site, url, mediaUrl, link)
  // e gerando conexões HATEOAS oficiais para cada recurso
  const cleanSources = sources.map((s) => toCleanSource(s, baseUrl));

  // Paginação no padrão nestjs-typeorm-paginate e Spring HATEOAS
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
    `${baseUrl}/api/news`,
    {
      category: category || undefined,
      type: type || undefined,
      active: active || undefined,
    },
    {
      categories: { href: `${baseUrl}/api/categories` },
      images: { href: `${baseUrl}/api/images` },
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
