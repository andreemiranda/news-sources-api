export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { getDetailedNewsStats } from '@/lib/stats';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
  const itemsPerPage = Math.min(30, Math.max(1, parseInt(limitParam, 10) || 10));
  const category = url.searchParams.get('category') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const refresh = url.searchParams.get('refresh') === 'true';

  const report = await getDetailedNewsStats(
    {
      itemsPerPage,
      category,
      type,
      refresh,
    },
    req
  );

  return NextResponse.json(report, {
    headers: {
      'X-WP-Total': String(report.meta.totalItems),
      'X-WP-TotalPages': String(report.meta.totalPages),
    },
  });
}
