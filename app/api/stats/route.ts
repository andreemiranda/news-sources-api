import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  return NextResponse.json({ success: true, data: getStats() });
}
