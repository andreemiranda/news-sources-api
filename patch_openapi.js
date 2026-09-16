const fs = require('fs');
let code = fs.readFileSync('app/api/openapi.json/route.ts', 'utf8');

// Add security schemes
code = code.replace(
  /securitySchemes: \{\},/,
  `securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],`
);

// Add 401 responses to each path
const authError = `'401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },`;

// Add 401 response to /news
code = code.replace(
  /'200': \{\s*description: 'Successful response',[\s\S]*?\}\s*\}\s*\},/,
  match => match + `\n            ${authError}`
);

// Add 401 response to /news/{id}
code = code.replace(
  /'200': \{\s*description: 'Successful response with live news articles',[\s\S]*?\}\s*\}\s*\},/,
  match => match + `\n            ${authError}`
);

// Add 401 response to /images
code = code.replace(
  /'200': \{\s*description: 'Successful response',\s*content: \{\s*'application\/json': \{\s*schema: \{\s*type: 'array',\s*items: \{ \$ref: '#\/components\/schemas\/Source' \}\s*\}\s*\}\s*\}\s*\}/g,
  match => match + `,\n            ${authError}`
);

// Add 401 response to /images/{id}
code = code.replace(
  /'200': \{\s*description: 'Successful response with live media uploads',[\s\S]*?\}\s*\}\s*\},/,
  match => match + `\n            ${authError}`
);

fs.writeFileSync('app/api/openapi.json/route.ts', code);
