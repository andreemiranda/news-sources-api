
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSourceById } from '@/lib/sources';
import { fetchSourceContent } from '@/lib/content';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const source = getSourceById(id);

  if (!source) {
    return NextResponse.json(
      { success: false, error: `News source with id '${id}' not found.` },
      { status: 404 }
    );
  }

  const url = new URL(req.url);
  const metaOnly = url.searchParams.get('meta') === 'true';

  if (metaOnly) {
    return NextResponse.json({ success: true, data: source });
  }

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('per_page') || '10';
  const limit = parseInt(limitParam, 10);
  const search = url.searchParams.get('search') || undefined;
  const raw = url.searchParams.get('raw') === 'true';

  try {
    const data = await fetchSourceContent(source, { page, limit, search, raw });
    const headers: Record<string, string> = {};
    if (data && data.pagination) {
      if (data.pagination.total !== undefined) headers['X-WP-Total'] = data.pagination.total.toString();
      if (data.pagination.totalPages !== undefined) headers['X-WP-TotalPages'] = data.pagination.totalPages.toString();
    }
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, source },
      { status: 502 }
    );
  }
}
