
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }
  const stats = getStats();
  return NextResponse.json({ 
    success: true, 
    status: 'ok',
    timestamp: new Date().toISOString(),
    data: stats 
  });
}
