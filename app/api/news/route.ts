
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAllSources, getStats, getSourcesByCategory } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse, paginate } from '@/lib/auth';

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
  const statsOnly = url.searchParams.get('stats') === 'true';

  if (statsOnly) {
    return NextResponse.json({ success: true, data: getStats() });
  }

  let sources = getAllSources();

  if (category) {
    sources = getSourcesByCategory(category);
  }

  if (type) {
    sources = sources.filter((s) => s.type === type);
  }

  if (active !== null && active !== undefined) {
    const isActive = active === 'true';
    sources = sources.filter((s) => s.active === isActive);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const mappedSources = sources.map((s) => ({
    ...s,
    _links: {
      self: { href: `${baseUrl}/api/news/${s.id}` }
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
