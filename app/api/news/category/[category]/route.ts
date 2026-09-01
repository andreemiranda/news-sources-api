export const runtime = 'edge';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSourcesByCategory } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse, paginate } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  const sources = getSourcesByCategory(decodedCategory);

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '100';
  const limit = parseInt(limitParam, 10);

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
