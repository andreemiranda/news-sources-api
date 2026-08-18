import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.API_KEY || 'bn_88feb5baa3f84955677e8c11453aae352811b9fe6c3398cd';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function validateApiKey(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim();
    if (key && timingSafeEqual(key, API_KEY)) return true;
  }

  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader && apiKeyHeader.trim() && timingSafeEqual(apiKeyHeader.trim(), API_KEY)) return true;

  const url = new URL(req.url);
  const queryKey = url.searchParams.get('api_key') || url.searchParams.get('apiKey');
  if (queryKey && timingSafeEqual(queryKey, API_KEY)) return true;

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
  const safeLimit = Math.min(100, Math.max(1, limit || 20));
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
