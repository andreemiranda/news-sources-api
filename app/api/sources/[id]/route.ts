import { NextRequest, NextResponse } from 'next/server';
import { getSourceById } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse, notFoundResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const source = getSourceById(params.id);

  if (!source) {
    return notFoundResponse(`Source with id '${params.id}' not found.`);
  }

  return NextResponse.json({ success: true, data: source });
}
