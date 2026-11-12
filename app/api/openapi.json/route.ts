import { NextRequest, NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/openapi-spec';

export async function GET(req: NextRequest) {
  const spec = getOpenApiSpec(req);
  return NextResponse.json(spec);
}
