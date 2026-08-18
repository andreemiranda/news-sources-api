# Correção do deploy Cloudflare Workers

## Alterações principais

- Next.js atualizado de 13.5.1 para 15.5.22.
- React mantido na linha 18.3.1 para reduzir alterações no código da aplicação.
- `eslint-config-next` alinhado com Next.js 15.5.22.
- Adicionado `@opennextjs/cloudflare` 1.20.2.
- Adicionado Wrangler 4.123.0 como dependência de desenvolvimento.
- Criado `wrangler.jsonc` com Worker `news-sources-api`, `nodejs_compat`, assets do OpenNext e segredo obrigatório `API_KEY`.
- Criado `open-next.config.ts`.
- Criada integração de desenvolvimento do OpenNext no `next.config.mjs`.
- Corrigido o acesso aos dados para não depender de `fs`/`path` em runtime do Worker.
- Atualizadas as rotas dinâmicas para o formato de `params` assíncrono do Next.js 15.
- Removida a API Key hardcoded do código e da documentação.
- Adicionado cache para arquivos estáticos do Next.js.
- Removido o `package-lock.json` antigo porque ele estava preso ao Next.js 13.5.1. Ele deve ser regenerado com `npm install`.

## Instalação local

```bash
npm install
npm run build
```

Para testar como Cloudflare Worker:

```bash
npm run build:cloudflare
npm run preview
```

## Cloudflare Workers Builds

Use exatamente:

```text
Build command:
npm run build:cloudflare

Deploy command:
npm run deploy
```

No Cloudflare, cadastre `API_KEY` como Secret/runtime variable.

O `package-lock.json` gerado pelo `npm install` deve ser commitado no repositório depois da primeira instalação local.
