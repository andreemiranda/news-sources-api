import { NextRequest, NextResponse } from 'next/server';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function validateApiKey(req: NextRequest): boolean {
  const apiKey = process.env.API_KEY;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim();
    if (key && apiKey && timingSafeEqual(key, apiKey)) return true;
  }

  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader && apiKeyHeader.trim() && apiKey && timingSafeEqual(apiKeyHeader.trim(), apiKey)) return true;

  const url = new URL(req.url);
  const queryKey = url.searchParams.get('api_key') || url.searchParams.get('apiKey');
  if (queryKey && apiKey && timingSafeEqual(queryKey, apiKey)) return true;

  return false;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized. Provide a valid API key via Authorization header (Bearer <key>), x-api-key header, or api_key query parameter.',
    },
    { status: 401 }
  );
}

export function notFoundResponse(message: string) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.min(1000, Math.max(1, limit || 100));
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;
  const paged = items.slice(start, end);
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    items: paged,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
}
