export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { APP_VERSION, BUILD_ID, DEPLOYMENT_TIME } from '@/src/config/version';
import { getEnv } from '@/src/config/env';

export async function GET() {
  const env = getEnv();

  return NextResponse.json(
    {
      version: APP_VERSION,
      buildId: BUILD_ID,
      deploymentTime: DEPLOYMENT_TIME,
      environment: env.NODE_ENV,
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'synchronized',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-App-Version': APP_VERSION,
        'X-Build-Id': BUILD_ID,
      },
    }
  );
}
