
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getStats, getBaseUrl } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { getDetailedNewsStats } from '@/lib/stats';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const isDetailed =
    url.searchParams.get('detailed') === 'true' ||
    url.searchParams.get('full') === 'true' ||
    url.searchParams.get('live') === 'true';

  if (isDetailed) {
    const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
    const itemsPerPage = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
    const category = url.searchParams.get('category') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const refresh = url.searchParams.get('refresh') === 'true';

    const report = await getDetailedNewsStats({ itemsPerPage, category, type, refresh }, req);
    return NextResponse.json(report, {
      headers: {
        'X-WP-Total': String(report.meta.totalItems),
        'X-WP-TotalPages': String(report.meta.totalPages),
      },
    });
  }

  const baseUrl = getBaseUrl(req);
  const stats = getStats();
  return NextResponse.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    data: stats,
    _links: {
      self: { href: `${baseUrl}/api/stats` },
      report: { href: `${baseUrl}/api/stats/news` },
      news: { href: `${baseUrl}/api/news` },
      images: { href: `${baseUrl}/api/images` },
      categories: { href: `${baseUrl}/api/categories` },
    },
  });
}
