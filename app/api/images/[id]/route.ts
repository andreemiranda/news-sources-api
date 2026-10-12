export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getMediaSourceById, getBaseUrl } from '@/lib/sources';
import { fetchMediaContent } from '@/lib/content';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { toCleanSource, paginateWithHateoas } from '@/lib/hateoas';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const source = getMediaSourceById(id);

  if (!source) {
    return NextResponse.json(
      { success: false, error: `Image source with id '${id}' not found.` },
      { status: 404 }
    );
  }

  const baseUrl = getBaseUrl(req);
  const url = new URL(req.url);
  const metaOnly = url.searchParams.get('meta') === 'true';

  if (metaOnly) {
    return NextResponse.json(toCleanSource(source, baseUrl));
  }

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
  const limit = parseInt(limitParam, 10);
  const search = url.searchParams.get('search') || undefined;
  const format = url.searchParams.get('format');

  try {
    const data = await fetchMediaContent(source, { page, limit, search });

    // Vincular links HATEOAS a cada imagem/mídia
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
        source: { href: `${baseUrl}/api/images/${source.id}` },
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
