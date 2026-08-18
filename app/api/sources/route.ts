import { NextRequest, NextResponse } from 'next/server';
import { getAllSources, getStats, getSourcesByCategory } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse, paginate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
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

  const result = paginate(sources, page, limit);

  return NextResponse.json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}
