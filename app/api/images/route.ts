export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse, paginate } from '@/lib/auth';
import { getAllMediaSources } from '@/lib/media';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
  const limit = parseInt(limitParam, 10);
  const activeParam = url.searchParams.get('active');
  let sources = getAllMediaSources();

  if (activeParam !== null) {
    const isActive = activeParam.toLowerCase() === 'true';
    sources = sources.filter((s) => s.active === isActive);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const mappedSources = sources.map((s) => ({
    ...s,
    _links: {
      self: { href: `${baseUrl}/api/images/${s.id}` }
    }
  }));

  const result = paginate(mappedSources, page, limit);

  return NextResponse.json({
    success: true,
    data: result.items,
    meta: result.meta,
  }, {
    headers: {
      'X-WP-Total': result.meta.total.toString(),
      'X-WP-TotalPages': result.meta.totalPages.toString(),
    }
  });
}
