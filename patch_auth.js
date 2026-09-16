const fs = require('fs');
let code = fs.readFileSync('lib/auth.ts', 'utf8');

code = code.replace(
  /export function validateApiKey\(req: NextRequest\): boolean \{[\s\S]*?return true;\n\}/,
`export function validateApiKey(req: NextRequest): boolean {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('API_KEY is not configured in the environment.');
    return false;
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim();
    if (key && safeCompare(key, apiKey)) return true;
  }
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader && safeCompare(apiKeyHeader, apiKey)) return true;
  const url = new URL(req.url);
  const queryKey = url.searchParams.get('api_key') || url.searchParams.get('apiKey');
  if (queryKey && safeCompare(queryKey, apiKey)) return true;
  return false;
}`
);

fs.writeFileSync('lib/auth.ts', code);
