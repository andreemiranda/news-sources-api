const fs = require('fs');

function makeClient(file) {
  let text = fs.readFileSync(file, 'utf8');
  text = '"use client";\n' + text;
  
  // Revert the next/dynamic change
  text = text.replace(
    "import dynamic from 'next/dynamic';\nconst SwaggerUIWrapper = dynamic(() => import('@/components/SwaggerUIWrapper'), { ssr: false });",
    "import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';"
  );
  
  fs.writeFileSync(file, text);
}

makeClient('app/page.tsx');
