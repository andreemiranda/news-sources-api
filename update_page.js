const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf8');

const regex = /<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">[\s\S]*?<\/Link>\s*<\/div>\s*<\/div>\s*<\/div>/;
content = content.replace(regex, `
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <SwaggerUIWrapper spec={spec} />
      </div>
`);

fs.writeFileSync('app/page.tsx', content);
