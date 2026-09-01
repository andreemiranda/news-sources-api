'use client';

import dynamic from 'next/dynamic';

const SwaggerUIWrapper = dynamic(() => import('@/components/SwaggerUIWrapper'), { 
  ssr: false 
});

export default function SwaggerClient({ spec }: { spec: any }) {
  return <SwaggerUIWrapper spec={spec} />;
}
