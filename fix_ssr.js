const fs = require('fs');

function fixFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(
    "import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';",
    "import dynamic from 'next/dynamic';\nconst SwaggerUIWrapper = dynamic(() => import('@/components/SwaggerUIWrapper'), { ssr: false });"
  );
  fs.writeFileSync(file, text);
}

fixFile('app/page.tsx');
