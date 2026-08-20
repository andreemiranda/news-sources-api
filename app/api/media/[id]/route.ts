import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { getMediaSourceById } from '@/lib/media';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const source = getMediaSourceById(id);

  if (!source) {
    return NextResponse.json(
      { success: false, error: 'Media source not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: source,
  });
}
