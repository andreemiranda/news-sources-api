import { NextRequest, NextResponse } from 'next/server';
import { getSourcesByCategory } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse, notFoundResponse, paginate } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { category: categoryParam } = await params;
  const category = decodeURIComponent(categoryParam);
  const sources = getSourcesByCategory(category);

  if (sources.length === 0) {
    return notFoundResponse(`No sources found for category '${category}'.`);
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const result = paginate(sources, page, limit);

  return NextResponse.json({
    success: true,
    category,
    data: result.items,
    meta: result.meta,
  });
}
