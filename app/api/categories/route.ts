import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/sources';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return unauthorizedResponse();
  }

  const categories = getCategories();

  return NextResponse.json({
    success: true,
    data: categories,
    meta: { total: categories.length },
  });
}
