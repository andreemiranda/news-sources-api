'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function SwaggerUIWrapper({ spec }: { spec: object }) {
  return (
    <SwaggerUI
      spec={spec}
      docExpansion="list"
      defaultModelsExpandDepth={1}
      defaultModelExpandDepth={1}
      filter={true}
      persistAuthorization={true}
      displayRequestDuration={true}
      tryItOutEnabled={false}
    />
  );
}
