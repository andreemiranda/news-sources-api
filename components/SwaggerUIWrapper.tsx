'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function SwaggerUIWrapper({ spec }: { spec: any }) {
  return (
    <div className="bg-white rounded-lg p-4">
      <SwaggerUI spec={spec} />
    </div>
  );
}
