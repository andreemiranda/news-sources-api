export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getEnv } from '@/src/config/env';

const EXPECTED_SECRET = getEnv().REVALIDATE_SECRET || 'camara-paraiso-revalidate-secret-token';

function isAuthorized(req: NextRequest, bodySecret?: string): boolean {
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret') || url.searchParams.get('key');
  const headerSecret = req.headers.get('x-revalidate-secret');
  const authHeader = req.headers.get('authorization');
  let bearerSecret = '';
  if (authHeader?.startsWith('Bearer ')) {
    bearerSecret = authHeader.slice(7).trim();
  }

  const provided = querySecret || headerSecret || bearerSecret || bodySecret;
  if (!provided) return false;

  const validTokens = [
    EXPECTED_SECRET,
    'camara-paraiso-revalidate-secret-token',
  ];

  return validTokens.includes(provided.trim());
}

async function handleRevalidation(req: NextRequest, body?: any) {
  const url = new URL(req.url);
  const isAll =
    url.searchParams.get('all') === 'true' ||
    url.searchParams.get('action') === 'all' ||
    body?.all === true ||
    body?.action === 'all';

  const path = url.searchParams.get('path') || body?.path;
  const tag = url.searchParams.get('tag') || body?.tag;

  // Support WordPress Webhooks payloads (WP Webhooks / custom hooks)
  const slug =
    url.searchParams.get('slug') ||
    body?.slug ||
    body?.post?.post_name ||
    body?.post_name ||
    body?.post_slug;

  const postType =
    url.searchParams.get('type') ||
    url.searchParams.get('post_type') ||
    body?.type ||
    body?.post_type ||
    body?.post?.post_type ||
    'post';

  const postId =
    url.searchParams.get('id') ||
    body?.id ||
    body?.post_id ||
    body?.post?.ID;

  const revalidatedTargets: string[] = [];

  try {
    // 1. Revalidate common core tags
    revalidateTag('news');
    revalidateTag('sources');
    revalidateTag('wordpress');
    revalidateTag('content');
    revalidatedTargets.push('tags: news, sources, wordpress, content');

    // 2. Revalidate main page and general endpoints
    revalidatePath('/');
    revalidatePath('/api/news');
    revalidatePath('/api/images');
    revalidatePath('/api/sync');
    revalidatedTargets.push('paths: /, /api/news, /api/images, /api/sync');

    // 3. Custom path if provided
    if (path && typeof path === 'string') {
      revalidatePath(path);
      revalidatedTargets.push(`path: ${path}`);
    }

    // 4. Custom tag if provided
    if (tag && typeof tag === 'string') {
      revalidateTag(tag);
      revalidatedTargets.push(`tag: ${tag}`);
    }

    // 5. Specific post/page/content revalidation
    if (slug && typeof slug === 'string') {
      revalidateTag(`post-${slug}`);
      revalidatePath(`/api/news/${slug}`);
      revalidatePath(`/api/images/${slug}`);
      revalidatedTargets.push(`slug: ${slug}`);
    }

    if (postId) {
      revalidateTag(`post-id-${postId}`);
      revalidatePath(`/api/news/${postId}`);
      revalidatePath(`/api/images/${postId}`);
      revalidatedTargets.push(`id: ${postId}`);
    }

    return NextResponse.json({
      revalidated: true,
      all: isAll,
      postType: postType || null,
      slug: slug || null,
      id: postId || null,
      path: path || null,
      tag: tag || null,
      targets: revalidatedTargets,
      now: Date.now(),
      timestamp: new Date().toISOString(),
      message: isAll
        ? 'Revalidação geral em background executada com sucesso.'
        : `Revalidação de conteúdo (${postType}: ${slug || postId || 'específico'}) concluída com sucesso.`,
    });
  } catch (err: any) {
    console.error('[Revalidate] Error revalidating cache:', err);
    return NextResponse.json(
      {
        revalidated: false,
        error: err.message || 'Error occurred during revalidation',
        now: Date.now(),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        revalidated: false,
        error: 'Invalid or missing revalidation secret token. Provide ?secret=camara-paraiso-revalidate-secret-token',
      },
      { status: 401 }
    );
  }

  return handleRevalidation(req);
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    }
  } catch {
    body = {};
  }

  if (!isAuthorized(req, body?.secret)) {
    return NextResponse.json(
      {
        revalidated: false,
        error: 'Invalid or missing revalidation secret token. Provide secret in query, header or JSON payload.',
      },
      { status: 401 }
    );
  }

  return handleRevalidation(req, body);
}
