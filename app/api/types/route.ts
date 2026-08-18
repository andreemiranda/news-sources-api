import { NextRequest, NextResponse } from 'next/server';
import { getTypes } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const types = getTypes();

  return NextResponse.json({
    success: true,
    data: types,
    meta: { total: types.length },
  });
}
