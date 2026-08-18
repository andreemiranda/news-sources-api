# Guia de Deploy no Cloudflare Workers

## Por que ocorria o erro 401 e a exclusão da variável no Cloudflare?

1. **Acesso à variável de ambiente no runtime do Worker**: No runtime V8 Isolate da Cloudflare, variáveis de ambiente e secrets são passadas pelo contexto `env` da Cloudflare (`getCloudflareContext().env`), enquanto o código anterior lia apenas `process.env.API_KEY`. O arquivo `lib/auth.ts` foi atualizado para ler tanto de `process.env` (Node.js) quanto de `getCloudflareContext().env` (Cloudflare Workers).

2. **Diferença entre Variável de Texto (`vars`) e Segredo (`secrets`)**:
   - Se a `API_KEY` for cadastrada no Dashboard do Cloudflare como **Variable (texto simples)**, o Wrangler tenta sincronizar com o `wrangler.jsonc` local e **apaga** a variável remota se ela não estiver listada no bloco `vars` do arquivo.
   - Para tokens e chaves de segurança (como `API_KEY`), cadastre como **Secret** via comando ou no painel como variável criptografada. Os secrets nunca são apagados pelo Wrangler no deploy.

---

## Como cadastrar a `API_KEY` corretamente no Cloudflare

### Opção 1: Via Linha de Comando (Recomendado)
```bash
npx wrangler secret put API_KEY
```
Quando solicitado, cole o valor da sua chave (ex: `bn_88feb5baa3f84955677e8c11453aae352811b9fe6c3398cd`).

### Opção 2: Pelo Painel do Cloudflare
1. Acesse o **Cloudflare Dashboard** > **Workers & Pages**.
2. Clique no seu worker `news-sources-api`.
3. Vá em **Settings** > **Variables and Secrets**.
4. Clique em **Add** e escolha o tipo **Secret** (variável criptografada) com o nome `API_KEY`.
5. Salve e faça o deploy.

---

## Comandos de Build e Deploy

```bash
# 1. Instalar dependências
npm install

# 2. Compilar para Cloudflare Worker
npm run build:cloudflare

# 3. Publicar no Cloudflare
npm run deploy
```

---

## Testando os Endpoints

Após o deploy e cadastro do secret:
- `https://news-sources-api.mirandinhacontabilidade.workers.dev/api/sources?api_key=SUA_CHAVE`
- `https://news-sources-api.mirandinhacontabilidade.workers.dev/api/sources/1?api_key=SUA_CHAVE`
- `https://news-sources-api.mirandinhacontabilidade.workers.dev/api/categories?api_key=SUA_CHAVE`
- `https://news-sources-api.mirandinhacontabilidade.workers.dev/api/stats?api_key=SUA_CHAVE`
- `https://news-sources-api.mirandinhacontabilidade.workers.dev/api/openapi.json?api_key=SUA_CHAVE`
- `https://news-sources-api.mirandinhacontabilidade.workers.dev/docs` (com botão de autorização integrado)
