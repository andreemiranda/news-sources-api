export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getApiIndexPayload } from '@/lib/stats';

export async function GET(req: NextRequest) {
  const payload = getApiIndexPayload(req);
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
