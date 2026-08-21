import { NextRequest, NextResponse } from 'next/server';
import { getMediaSourceById } from '@/lib/media';
import { validateApiKey, unauthorizedResponse, notFoundResponse } from '@/lib/auth';
import { fetchMediaContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const mediaSource = getMediaSourceById(id);

  if (!mediaSource) {
    return notFoundResponse(`Media source with id '${id}' not found. Valid IDs range from 28 to 54.`);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || searchParams.get('per_page') || '10', 10);
  const search = searchParams.get('search') || undefined;
  const raw = searchParams.get('raw') === 'true';

  try {
    const content = await fetchMediaContent(mediaSource, {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
      search,
      raw,
    });

    return NextResponse.json({
      success: true,
      data: content,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error fetching media content from source',
        source: mediaSource,
      },
      { status: 502 }
    );
  }
}
