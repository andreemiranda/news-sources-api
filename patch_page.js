const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Replace the text in the description
code = code.replace(/Todos os\s*endpoints requerem autenticação por API Key\./g, 'Todos os endpoints são de acesso público.');

// Remove the amber warning box about authentication
code = code.replace(/<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">[\s\S]*?<SwaggerUIWrapper spec={spec} \/>/g, 
`<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SwaggerUIWrapper spec={spec} />`);

fs.writeFileSync('app/page.tsx', code);
