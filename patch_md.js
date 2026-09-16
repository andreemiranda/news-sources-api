const fs = require('fs');
let code = fs.readFileSync('CLOUDFLARE_DEPLOY.md', 'utf8');

// Replace the hardcoded secret string
code = code.replace(/bn_88feb5baa3f84955677e8c11453aae352811b9fe6c3398cd/g, "sua-chave-aqui");

fs.writeFileSync('CLOUDFLARE_DEPLOY.md', code);
