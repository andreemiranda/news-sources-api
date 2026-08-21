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
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const search = url.searchParams.get('search') || undefined;
  const raw = url.searchParams.get('raw') === 'true';

  try {
    const data = await fetchSourceContent(source, { page, limit, search, raw });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, source },
      { status: 502 }
    );
  }
}
