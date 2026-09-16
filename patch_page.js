const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Revert description text
code = code.replace(
  'Todos os endpoints são de acesso público.',
  'Todos os endpoints requerem autenticação por API Key. Use a documentação interativa abaixo para explorar e testar cada endpoint.'
);

// Add the amber box back
const amberBox = `<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm">
              <p className="font-semibold text-amber-900 mb-1">
                Autenticação necessária
              </p>
              <p className="text-amber-800 mb-2">
                Para testar os endpoints no Swagger UI, clique no botão
                &quot;Authorize&quot; e insira a sua API Key.
              </p>
              <p className="text-amber-700 text-xs mt-2">
                A chave pode ser enviada via header
                <code className="mx-1 px-1 bg-amber-100 rounded">Authorization: Bearer &lt;key&gt;</code>,
                header
                <code className="mx-1 px-1 bg-amber-100 rounded">x-api-key</code>,
                ou query parameter
                <code className="mx-1 px-1 bg-amber-100 rounded">?api_key=&lt;key&gt;</code>
              </p>
            </div>
          </div>
        </div>`;

code = code.replace(
  /<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">\s*<SwaggerUIWrapper spec={spec} \/>/g,
  `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        ${amberBox}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <SwaggerUIWrapper spec={spec} />`
);

fs.writeFileSync('app/page.tsx', code);
