import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/src/config/env';

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
  const env = getEnv();
  return env.API_KEY || env.REVALIDATE_SECRET || 'camara-paraiso-revalidate-secret-token';
}

export function validateApiKey(req: NextRequest): boolean {
  const apiKey = getApiKey();
  const revalidateSecret = getEnv().REVALIDATE_SECRET;

  let providedKey = '';
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  }
  if (!providedKey) {
    providedKey = (req.headers.get('x-api-key') || '').trim();
  }
  if (!providedKey) {
    try {
      const url = new URL(req.url);
      providedKey = (url.searchParams.get('api_key') || url.searchParams.get('apiKey') || '').trim();
    } catch {}
  }

  if (!providedKey) return false;

  if (apiKey && safeCompare(providedKey, apiKey)) return true;
  if (revalidateSecret && safeCompare(providedKey, revalidateSecret)) return true;

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
