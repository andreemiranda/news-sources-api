const fs = require('fs');
let code = fs.readFileSync('app/api/openapi.json/route.ts', 'utf8');

// Remove security schemes
code = code.replace(/securitySchemes:\s*\{[\s\S]*?\},/, 'securitySchemes: {},');
// Remove global security
code = code.replace(/security:\s*\[\{ ApiKeyAuth: \[\] \}, \{ BearerAuth: \[\] \}\],/, '');
// Remove 401 responses
code = code.replace(/'401':\s*\{\s*description:\s*'Unauthorized',[\s\S]*?\},/g, '');

fs.writeFileSync('app/api/openapi.json/route.ts', code);
