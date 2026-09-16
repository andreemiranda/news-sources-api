const fs = require('fs');
let code = fs.readFileSync('lib/auth.ts', 'utf8');
code = code.replace(/export function validateApiKey\([\s\S]*?return false;\n\}/, 
`export function validateApiKey(req: NextRequest): boolean {
  // Authentication removed as requested to fix Unauthorized issues
  return true;
}`);
fs.writeFileSync('lib/auth.ts', code);
