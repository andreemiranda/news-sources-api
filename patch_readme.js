const fs = require('fs');

// Patch README.md
let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace(
  /> \*\*Importante:\*\* A autenticação via API Key foi \*\*removida\*\* para facilitar o acesso público aos endpoints\.[\s\S]*?## Documentação Interativa/,
  `## Documentação Interativa`
);
readme = readme.replace(
  /## Documentação Interativa/,
  `## Autenticação

Todos os endpoints exigem envio da API Key em um dos seguintes formatos:
1. Header \`Authorization: Bearer <sua-chave>\`
2. Header \`x-api-key: <sua-chave>\`
3. Query parameter \`?api_key=<sua-chave>\`

> **Configuração em Produção:** No Cloudflare Workers, Netlify ou Render, cadastre o segredo ou variável de ambiente \`API_KEY\`.

---

## Documentação Interativa`
);
fs.writeFileSync('README.md', readme);

// Patch API_DOCS.md
let apiDocs = fs.readFileSync('API_DOCS.md', 'utf8');
apiDocs = apiDocs.replace(
  /> \*\*Importante:\*\* A autenticação por API Key foi \*\*removida\*\* para uso público dos endpoints\./,
  `> **Importante:** Todos os endpoints exigem autenticação enviando uma API Key (via header \`x-api-key\`, \`Authorization\` ou query parameter \`api_key\`).`
);

apiDocs = apiDocs.replace(
  /\| `404 Not Found` \| Não Encontrado \| O ID da fonte não existe \|/,
  `| \`401 Unauthorized\` | Não Autorizado | Chave de API ausente, inválida ou não autorizada |
| \`404 Not Found\` | Não Encontrado | O ID da fonte não existe |`
);
fs.writeFileSync('API_DOCS.md', apiDocs);

