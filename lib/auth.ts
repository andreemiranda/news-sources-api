import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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
  // 1. Check process.env (Node.js runtime / Next.js build-time inline)
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Check OpenNext Cloudflare context if running inside Cloudflare Worker runtime
  try {
    const ctx = getCloudflareContext();
    const envKey = (ctx?.env as Record<string, string> | undefined)?.API_KEY;
    if (envKey) {
      return envKey;
    }
  } catch {
    // Ignore when not running inside Cloudflare Worker environment
  }
  return '';
}

export function validateApiKey(req: NextRequest): boolean {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('API_KEY is not configured in the environment.');
    return false;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim();
    if (key && safeCompare(key, apiKey)) return true;
  }

  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader && safeCompare(apiKeyHeader, apiKey)) return true;

  const url = new URL(req.url);
  const queryKey = url.searchParams.get('api_key') || url.searchParams.get('apiKey');
  if (queryKey && safeCompare(queryKey, apiKey)) return true;

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
