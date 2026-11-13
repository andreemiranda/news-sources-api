import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getEnv } from '@/src/config/env';

function safeCompare(provided: string, expected: string): boolean {
  const cleanProvided = provided.trim();
  const cleanExpected = expected.trim();
  if (!cleanProvided || !cleanExpected) return false;
  // Limite razoável para prevenir ataques de DoS por CPU
  if (cleanProvided.length > 512) return false;

  try {
    // Normaliza para hashes SHA-256 de 32 bytes para prevenir vazamento de tamanho e timing attacks
    const hashProvided = crypto.createHash('sha256').update(cleanProvided).digest();
    const hashExpected = crypto.createHash('sha256').update(cleanExpected).digest();
    return crypto.timingSafeEqual(hashProvided, hashExpected);
  } catch {
    return false;
  }
}

export function getApiKey(): string {
  const env = getEnv();
  return env.API_KEY?.trim() || '';
}

export function validateApiKey(req: NextRequest): boolean {
  const env = getEnv();
  const apiKey = (env.API_KEY || process.env.API_KEY || process.env.CLOUDFLARE_API_KEY || process.env.api_key || '').trim();
  const revalidateSecret = (env.REVALIDATE_SECRET || process.env.REVALIDATE_SECRET || process.env.revalidate_secret || '').trim();

  // Se a chave não estiver configurada, negar todas as requisições protegidas
  if (!apiKey && !revalidateSecret) {
    return false;
  }

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
      providedKey = (url.searchParams.get('ref') || '').trim();
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
      error: 'Unauthorized. Provide a valid credential via Authorization header (Bearer <value>), x-api-key header, or ref query parameter.',
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
