
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse, paginate } from '@/lib/auth';
import { getAllMediaSources, getMediaSourceById } from '@/lib/sources';
import { fetchMediaContent, slugify } from '@/lib/content';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const idParam = url.searchParams.get('id');

  // If ?id= is passed directly to /api/images/, fetch media content directly
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
    const raw = url.searchParams.get('raw') === 'true';

    try {
      const data = await fetchMediaContent(source, { page, limit, search, raw });
      const headers: Record<string, string> = {};
      if (data && data.pagination) {
        if (data.pagination.total !== undefined) headers['X-WP-Total'] = data.pagination.total.toString();
        if (data.pagination.totalPages !== undefined) headers['X-WP-TotalPages'] = data.pagination.totalPages.toString();
      }
      return NextResponse.json(data.items, { headers });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message, source },
        { status: 502 }
      );
    }
  }

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
  const limit = parseInt(limitParam, 10);
  const activeParam = url.searchParams.get('active');
  let sources = getAllMediaSources();

  if (activeParam !== null) {
    const isActive = activeParam.toLowerCase() === 'true';
    sources = sources.filter((s) => s.active === isActive);
  }

  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin);

  const mappedSources = sources.map((s) => ({
    ...s,
    slug: slugify(s.site),
    alt: `Mídias e imagens - ${s.site}`,
    _links: {
      self: { href: `${baseUrl}/api/images/${s.id}` }
    }
  }));

  const result = paginate(mappedSources, page, limit);

  return NextResponse.json(result.items, {
    headers: {
      'X-WP-Total': result.meta.total.toString(),
      'X-WP-TotalPages': result.meta.totalPages.toString(),
    }
  });
}
