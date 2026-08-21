import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { getAllMediaSources } from '@/lib/media';
import { Source, ApiResponse } from '@/lib/sources';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const activeParam = url.searchParams.get('active');
  let sources = getAllMediaSources();

  if (activeParam !== null) {
    const isActive = activeParam.toLowerCase() === 'true';
    sources = sources.filter((s) => s.active === isActive);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const mappedSources = sources.map((s) => ({
    ...s,
    url: `${baseUrl}/api/images/${s.id}`
  }));

  const response: ApiResponse<Source[]> = {
    success: true,
    data: mappedSources,
    meta: {
      total: sources.length,
    },
  };

  return NextResponse.json(response);
}
