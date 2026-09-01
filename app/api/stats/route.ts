
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/sources';

export async function GET(req: NextRequest) {
  const stats = getStats();
  return NextResponse.json({ 
    success: true, 
    status: 'ok',
    timestamp: new Date().toISOString(),
    data: stats 
  });
}
