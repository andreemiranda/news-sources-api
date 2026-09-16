import { NextRequest, NextResponse } from 'next/server';

function safeCompare(provided: string, expected: string): boolean {
  const cleanProvided = provided.trim();
  const cleanExpected = expected.trim();
  if (!cleanProvided || !cleanExpected) return false;
  if (cleanProvided.length !== cleanExpected.length) return false;
  let result = 0;
  for (let i = 0; i < cleanProvided.length; i++) {
    result |= cleanProvided.charCodeAt(i) ^ cleanExpected.charCodeAt(i);
  }
  return result === 0;
}

export function getApiKey(): string {
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return 'bn_88feb5baa3f84955677e8c11453aae352811b9fe6c3398cd';
}

export function validateApiKey(req: NextRequest): boolean {
  // Authentication removed as requested to fix Unauthorized issues
  return true;
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
