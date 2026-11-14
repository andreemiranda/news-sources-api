import assert from 'node:assert/strict';
import {
  parseRssFeed,
  resilientFetch,
  resolveWpTotalCount,
  fetchSourceContent,
  clearPreferredHostTiers,
  formatHttpStatusError,
} from './lib/content';
import { getDetailedNewsStats, clearStatsCache } from './lib/stats';
import { getAllSources } from './lib/sources';
import worker from './worker.js';

async function testOriginalNacaoJuridicaFeed() {
  console.log('\n[1/9] Teste original: https://www.nacaojuridica.com.br/feed/');
  const res = await fetch('https://www.nacaojuridica.com.br/feed/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  });
  console.log('Status:', res.status);
  const xml = await res.text();
  console.log('XML size:', xml.length);
  const { items } = parseRssFeed(xml);
  console.log('Items parsed:', items.length);
  assert.ok(res.ok, 'Expected nacaojuridica feed to return HTTP 2xx');
  assert.ok(items.length > 0, 'Expected parsed items > 0');
}

async function withMockedFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response> | Response,
  fn: () => Promise<void>
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return handler(url, init);
  }) as typeof fetch;

  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
    clearPreferredHostTiers();
    clearStatsCache();
  }
}

async function testNormalFetchAndEditorialFiltering() {
  console.log('\n[2/9] Cenário: Fetch normal com sucesso e contagem após filtros editoriais');
  const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel><title>Feed Teste</title>
      <item><title>Economia cresce no trimestre</title><description>Dados oficiais do setor produtivo com texto completo e detalhado para análise na imprensa.</description><guid>1</guid></item>
      <item><title>Bom dia cidade: veja a previsão</title><description>Chamada matinal</description><guid>2</guid></item>
      <item><title>AO VIVO: Assista ao telejornal</title><description>Assista ao vivo</description><guid>3</guid></item>
    </channel></rss>`;

  const parsed = parseRssFeed(sampleRss, 'Acre', '9848634844762');
  assert.equal(parsed.isValidFeed, true);
  assert.equal(parsed.rawItemCount, 3);
  assert.equal(parsed.filteredOutCount, 2);
  assert.equal(parsed.items.length, 1);

  await withMockedFetch(async () => new Response(sampleRss, { status: 200, headers: { 'Content-Type': 'application/xml' } }), async () => {
    clearStatsCache();
    const stats = await getDetailedNewsStats({ category: 'Acre', refresh: true, itemsPerPage: 10 });
    assert.equal(stats.summary.totalSources, 1);
    assert.equal(stats.summary.onlineSources, 1);
    assert.equal(stats.sources[0].totalNews, 1);
    assert.equal(stats.sources[0].parsedItems, 3);
    assert.equal(stats.sources[0].discardedItems, 2);
    assert.equal(stats.sources[0].stale, false);
  });
  console.log('  OK: Filtros editoriais e métricas parsedItems/discardedItems conferem.');
}

async function testUserAgentFallbackWithoutGlobalBlocking() {
  console.log('\n[3/9] Cenário: Fallback Googlebot/Facebookbot entre múltiplas fontes sem bloqueio global');
  clearPreferredHostTiers();
  const seenUas: Record<string, string[]> = {};

  await withMockedFetch(async (url, init) => {
    const host = new URL(url).hostname;
    const headers = new Headers(init?.headers);
    const ua = headers.get('User-Agent') || '';
    seenUas[host] = seenUas[host] || [];
    seenUas[host].push(ua);

    if (host === 'site-a.example.com') {
      if (ua.includes('Googlebot')) {
        return new Response('[{"id":1}]', { status: 200, headers: { 'x-wp-total': '15' } });
      }
      return new Response('Forbidden', { status: 403 });
    }
    if (host === 'site-b.example.com') {
      if (ua.includes('facebookexternalhit')) {
        return new Response('[{"id":2}]', { status: 200, headers: { 'x-wp-total': '42' } });
      }
      return new Response('Forbidden', { status: 403 });
    }
    return new Response('Not found', { status: 404 });
  }, async () => {
    // Ambas recebem site='' -> appDomain compartilhado, mas devem usar hostname da URL
    const sharedSite = 'api-propria.workers.dev';
    const r1 = await resilientFetch('https://site-a.example.com/wp-json/wp/v2/posts', sharedSite, true);
    const r2 = await resilientFetch('https://site-b.example.com/wp-json/wp/v2/posts', sharedSite, true);

    assert.equal(r1.status, 200);
    assert.equal(r1.headers.get('x-wp-total'), '15');
    assert.equal(r2.status, 200);
    assert.equal(r2.headers.get('x-wp-total'), '42');
    assert.ok(seenUas['site-a.example.com'].some((u) => u.includes('Googlebot')));
    assert.ok(seenUas['site-b.example.com'].some((u) => u.includes('facebookexternalhit')));
  });
  console.log('  OK: Fallback multi-tier isolado por hostname sem bloqueio cruzado.');
}

async function testWpApiFallbackToRss() {
  console.log('\n[4/9] Cenário: WP-API falhando/retornando HTML e caindo corretamente para fallback RSS');
  const fallbackRss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel><title>Portal Fallback</title>
      <item><title>Matéria via RSS Fallback 1</title><description>Conteúdo jornalístico completo sobre política municipal e orçamento público.</description><guid>a1</guid></item>
      <item><title>Matéria via RSS Fallback 2</title><description>Segunda matéria completa do feed alternativo quando REST JSON está bloqueado.</description><guid>a2</guid></item>
    </channel></rss>`;

  await withMockedFetch(async (url) => {
    if (url.includes('/wp-json/')) {
      // Simula portal que retorna HTML 200 em vez de JSON
      return new Response('<!DOCTYPE html><html><body>Access page</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (url.endsWith('/feed/')) {
      return new Response(fallbackRss, {
        status: 200,
        headers: { 'Content-Type': 'application/rss+xml' },
      });
    }
    return new Response('Not Found', { status: 404 });
  }, async () => {
    clearStatsCache();
    const stats = await getDetailedNewsStats({ category: 'Palmeiras', refresh: true, itemsPerPage: 10 });
    assert.equal(stats.summary.onlineSources, 1);
    assert.equal(stats.sources[0].totalNews, 2);
    assert.equal(stats.sources[0].parsedItems, 2);
    assert.equal(stats.sources[0].stale, false);

    const palmeirasSource = getAllSources().find((s) => s.category === 'Palmeiras')!;
    const ep = await fetchSourceContent(palmeirasSource, { page: 1, limit: 10, bypassCache: true });
    assert.equal(ep.pagination.total, 2);
    assert.equal(ep.items.length, 2);
  });
  console.log('  OK: WP-API com HTML/erro ativou fallback RSS tanto no endpoint quanto nas estatísticas.');
}

async function testWpApiMissingTotalHeader() {
  console.log('\n[5/9] Cenário: WP-API sem cabeçalho x-wp-total (usando x-wp-totalpages e paginação alternativa)');
  // Caso A: x-wp-total ausente, mas x-wp-totalpages=3 presente
  await withMockedFetch(async (url) => {
    const u = new URL(url);
    const page = Number(u.searchParams.get('page') || '1');
    if (page === 3) {
      return new Response(JSON.stringify([{ id: 21 }, { id: 22 }, { id: 23 }, { id: 24 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-wp-totalpages': '3' },
      });
    }
    return new Response(
      JSON.stringify(Array.from({ length: 10 }, (_, idx) => ({ id: (page - 1) * 10 + idx + 1 }))),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-wp-totalpages': '3' },
      }
    );
  }, async () => {
    const firstRes = await resilientFetch('https://noheader.example.com/wp-json/wp/v2/posts?page=1&per_page=10', '', true);
    const firstArr = await firstRes.json();
    const resolved = await resolveWpTotalCount(
      'https://noheader.example.com/wp-json/wp/v2/posts',
      firstRes,
      firstArr,
      '',
      10,
      10
    );
    assert.equal(resolved.total, 24);
    assert.equal(resolved.totalPages, 3);
    assert.equal(resolved.usedFallbackPagination, true);
  });

  // Caso B: nem x-wp-total nem x-wp-totalpages presentes, mas existe > 1 página (37 itens)
  await withMockedFetch(async (url) => {
    const u = new URL(url);
    const perPage = Number(u.searchParams.get('per_page') || '10');
    const page = Number(u.searchParams.get('page') || '1');
    const total = 37;
    const start = (page - 1) * perPage;
    const sliceLen = Math.max(0, Math.min(perPage, total - start));
    return new Response(
      JSON.stringify(Array.from({ length: sliceLen }, (_, idx) => ({ id: start + idx + 1 }))),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }, async () => {
    clearStatsCache();
    const stats = await getDetailedNewsStats({ category: 'Palmeiras', refresh: true, itemsPerPage: 10 });
    assert.equal(stats.sources[0].totalNews, 37);
    assert.equal(stats.sources[0].totalPages, 4);
  });
  console.log('  OK: Contagem exata preservada mesmo sem cabeçalho x-wp-total.');
}

async function testTimeoutAndRetryWithIndependentAbortControllers() {
  console.log('\n[6/9] Cenário: Timeout na tentativa primária + retry com AbortController independente');
  let wpAttempts = 0;
  let rssAttempts = 0;

  await withMockedFetch(async (url, init) => {
    assert.equal(init?.signal?.aborted, false, 'Cada tentativa deve iniciar com AbortSignal não abortado');
    if (url.includes('/wp-json/')) {
      wpAttempts += 1;
      return new Response('Service Unavailable', { status: 503 });
    }
    if (url.endsWith('/feed/')) {
      rssAttempts += 1;
      if (rssAttempts === 1) {
        const err = new Error('Simulated timeout');
        (err as any).name = 'TimeoutError';
        throw err;
      }
      return new Response(
        '<?xml version="1.0"?><rss version="2.0"><channel><item><title>Recuperada após retry</title><description>Notícia válida após timeout inicial com novo AbortController.</description></item></channel></rss>',
        { status: 200 }
      );
    }
    return new Response('', { status: 404 });
  }, async () => {
    clearStatsCache();
    const stats = await getDetailedNewsStats({ category: 'Palmeiras', refresh: true });
    assert.equal(stats.sources[0].status, 'online');
    assert.ok(wpAttempts >= 2, 'Deveria tentar WP-API com retry sem AbortSignal contaminado');
    assert.equal(rssAttempts, 2, 'RSS fallback deveria executar retry com novo AbortController');
    assert.equal(stats.sources[0].totalNews, 1);
  });

  // Também valida timeout + retry direto em fonte RSS (ex.: Acre)
  let acreAttempts = 0;
  await withMockedFetch(async (_url, init) => {
    assert.equal(init?.signal?.aborted, false);
    acreAttempts += 1;
    if (acreAttempts === 1) {
      const err = new Error('Simulated RSS timeout');
      (err as any).name = 'TimeoutError';
      throw err;
    }
    return new Response(
      '<?xml version="1.0"?><rss version="2.0"><channel><item><title>Feed Acre</title><description>Matéria completa carregada após retry independente de timeout.</description></item></channel></rss>',
      { status: 200 }
    );
  }, async () => {
    clearStatsCache();
    const stats = await getDetailedNewsStats({ category: 'Acre', refresh: true });
    assert.equal(stats.sources[0].status, 'online');
    assert.equal(stats.sources[0].totalNews, 1);
    assert.ok(acreAttempts >= 2);
  });
  console.log('  OK: Fallback e retry executaram com AbortControllers independentes.');
}

async function testAtomAndInvalidHtmlRejection() {
  console.log('\n[7/9] Cenário: Parser Atom (<entry>) e rejeição de página HTML falsa como rss_parse_error');
  const atomXml = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Portal Atom</title>
      <updated>2026-11-12T10:00:00Z</updated>
      <entry>
        <id>urn:uuid:1234</id>
        <title>Nova regulamentação jurídica entra em vigor</title>
        <link href="https://atom.example.com/post-1"/>
        <updated>2026-11-12T09:30:00Z</updated>
        <summary>Texto explicativo detalhado sobre a nova regulamentação publicada hoje no Diário Oficial.</summary>
      </entry>
    </feed>`;

  const parsedAtom = parseRssFeed(atomXml, 'Geral', '9999999999999');
  assert.equal(parsedAtom.isValidFeed, true);
  assert.equal(parsedAtom.items.length, 1);
  assert.equal(parsedAtom.items[0].title, 'Nova regulamentação jurídica entra em vigor');

  const htmlBlock = '<!DOCTYPE html><html><head><title>Blocked</title></head><body>Cloudflare check</body></html>';
  const parsedHtml = parseRssFeed(htmlBlock, 'Geral', '9999999999999');
  assert.equal(parsedHtml.isValidFeed, false);
  assert.equal(parsedHtml.items.length, 0);

  await withMockedFetch(async () => new Response(htmlBlock, { status: 200, headers: { 'Content-Type': 'text/html' } }), async () => {
    clearStatsCache();
    const stats = await getDetailedNewsStats({ category: 'Acre', refresh: true });
    assert.equal(stats.sources[0].status, 'unavailable');
    assert.equal(stats.sources[0].errorReason, 'rss_parse_error');
    assert.equal(stats.sources[0].totalNews, 0);
  });
  console.log('  OK: Atom suportado e HTML falso classificado como unavailable/rss_parse_error.');
}

async function testLastKnownGoodAndRecovery() {
  console.log('\n[8/9] Cenário: Preservação de último resultado válido (stale: true) e recuperação (stale: false)');
  let phase: 'healthy' | 'outage' | 'recovered' = 'healthy';

  await withMockedFetch(async () => {
    if (phase === 'healthy') {
      return new Response('[{"id":1}]', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-wp-total': '150' },
      });
    }
    if (phase === 'outage') {
      return new Response('Gateway Timeout', { status: 504 });
    }
    return new Response('[{"id":1}]', {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'x-wp-total': '155' },
    });
  }, async () => {
    clearStatsCache();
    // 1. Sondagem saudável
    const s1 = await getDetailedNewsStats({ category: 'Palmeiras', refresh: true });
    assert.equal(s1.sources[0].status, 'online');
    assert.equal(s1.sources[0].totalNews, 150);
    assert.equal(s1.sources[0].stale, false);
    assert.ok(s1.sources[0].lastSuccessfulCheck);

    // 2. Falha transitória -> preserva 150, status online, stale: true
    phase = 'outage';
    const s2 = await getDetailedNewsStats({ category: 'Palmeiras', refresh: true });
    assert.equal(s2.sources[0].status, 'online');
    assert.equal(s2.sources[0].totalNews, 150);
    assert.equal(s2.sources[0].stale, true);
    assert.equal(s2.sources[0].httpStatus, 504);

    // 3. Recuperação -> atualiza para 155, stale: false
    phase = 'recovered';
    const s3 = await getDetailedNewsStats({ category: 'Palmeiras', refresh: true });
    assert.equal(s3.sources[0].status, 'online');
    assert.equal(s3.sources[0].totalNews, 155);
    assert.equal(s3.sources[0].stale, false);
  });
  console.log('  OK: Last-Known-Good preservado na falha e redefinido na recuperação.');
}

async function testWorkersSubrequestBudgetAndLiveComparison() {
  console.log('\n[9/9] Cenário: Orçamento de subrequests Workers + Comparação ao vivo (G1 RSS x WP-API)');
  // 9a. Simulação de limite de subrequests (sem estourar 50 subrequests e com progresso incremental)
  let totalFetches = 0;
  await withMockedFetch(async (url) => {
    totalFetches += 1;
    if (url.includes('/wp-json/')) {
      return new Response('[{"id":1}]', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-wp-total': '100' },
      });
    }
    return new Response('<rss><channel><item><title>Teste</title><description>Descrição válida da matéria completa para contagem.</description></item></channel></rss>', {
      status: 200,
    });
  }, async () => {
    clearStatsCache();
    const pass1 = await getDetailedNewsStats({ refresh: true, maxSubrequests: 20 });
    assert.ok(totalFetches <= 20, `Subrequests usados (${totalFetches}) não podem exceder o orçamento de 20`);
    assert.ok(pass1.summary.onlineSources > 0, 'Lote 1 deve contabilizar fontes online');
    assert.equal(pass1.summary.partialProbe, true);

    totalFetches = 0;
    const pass2 = await getDetailedNewsStats({ refresh: false, maxSubrequests: 35 });
    assert.ok(totalFetches <= 35, `Pass 2 subrequests (${totalFetches}) respeitou orçamento`);
    assert.ok(pass2.summary.onlineSources > pass1.summary.onlineSources, 'Pass 2 deve avançar nas fontes pendentes');
  });

  // 9b. Comparação ao vivo: 3+ fontes G1 RSS e 3+ fontes WP-API
  clearStatsCache();
  clearPreferredHostTiers();
  const sources = getAllSources();
  const stats = await getDetailedNewsStats({ refresh: true, itemsPerPage: 10 });
  const targetIds = [
    '9886348421411', // G1 Brasil (RSS)
    '7915414156447', // G1 Tocantins (RSS)
    '5923414182828', // G1 Santa Catarina (RSS)
    '2431124818641', // G1 Mundo (RSS)
    '8742125891673', // O Jornal (WP-API)
    '8132269214748', // Conjur (WP-API)
    '5183624795316', // Exame Esporte (WP-API)
    '3313974548439', // Guaraiense (WP-API 0)
    '6242412692949', // Você S/A (HTML 200 bloqueio/paywall -> deve reportar unavailable/json_parse_error)
    '3388113412422', // Portal do Bico (DNS ENOTFOUND -> unavailable/connection_error)
  ];

  console.log(
    `  Live summary: online=${stats.summary.onlineSources}/${stats.summary.totalSources}, ` +
      `unavailable=${stats.summary.unavailableSources}, totalNews=${stats.summary.totalNews}`
  );

  for (const id of targetIds) {
    const src = sources.find((s) => String(s.id) === id)!;
    const st = stats.sources.find((s) => String(s.id) === id)!;
    try {
      const ep = await fetchSourceContent(src, { page: 1, limit: 10, bypassCache: true });
      const diff = Math.abs(ep.pagination.total - st.totalNews);
      // Fontes ao vivo podem publicar 1-5 matérias nos segundos entre requisições; tolerância <= 10 garante paridade
      assert.ok(
        diff <= 10,
        `Divergência inesperada em ${id} (${src.url}): endpoint=${ep.pagination.total} vs stats=${st.totalNews}`
      );
      assert.equal(st.status, 'online');
      console.log(`  [MATCH] ${id} (${src.type}): endpoint=${ep.pagination.total}, stats=${st.totalNews}, status=${st.status}, reason=${st.errorReason ?? 'ok'}`);
    } catch (err: any) {
      assert.equal(st.status, 'unavailable', `Fonte ${id} falhou no endpoint (${err.message}) mas stats marcou ${st.status}`);
      console.log(`  [MATCH-UNAVAILABLE] ${id} (${src.type}): endpointErr="${err.message}", statsStatus=${st.status}, http=${st.httpStatus}, reason=${st.errorReason}`);
    }
  }
}

async function testHttp525RecoveryCustomDomainAndFavicon() {
  console.log('\n[10/10] Cenário: Recuperação de HTTP 525, subdomínio news.normajuridica.com.br (sem localhost) e Favicons');
  assert.equal(formatHttpStatusError(525, '<none>'), 'SSL Handshake Failed');
  assert.equal(formatHttpStatusError(526, ''), 'Invalid SSL Certificate');

  const g1SampleXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel><title>G1 Tocantins</title>
      <item><title>Notícia Tocantins recuperada</title><description>Conteúdo jornalístico completo recuperado após fallback canônico contra HTTP 525.</description><guid>to-1</guid></item>
    </channel></rss>`;

  // 10a. Simula Worker no subdomínio customizado com 525 persistente -> erro não pode conter localhost nem <none>
  await withMockedFetch(async () => new Response('', { status: 525, statusText: '<none>' }), async () => {
    const req = new Request('https://news.normajuridica.com.br/api/news/7915414156447', {
      headers: { host: 'news.normajuridica.com.br', 'x-api-key': 'test-key' },
    });
    const res = await worker.fetch(req, { API_KEY: 'test-key' }, {} as any);
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(!body.error.includes('localhost'), `Erro não deve conter localhost: ${body.error}`);
    assert.ok(!body.error.includes('<none>'), `Erro não deve conter <none>: ${body.error}`);
    assert.ok(body.error.includes('news.normajuridica.com.br'), `Erro deve refletir o domínio real: ${body.error}`);
    assert.ok(body.error.includes('SSL Handshake Failed'), `Erro deve descrever HTTP 525: ${body.error}`);
  });

  // 10b. Simula /dynamo/.../rss2.xml retornando HTTP 525 e endpoint canônico /rss/g1/to/tocantins/ retornando 200
  await withMockedFetch(async (url) => {
    if (url.includes('/dynamo/to/tocantins/rss2.xml')) {
      return new Response('', { status: 525, statusText: '<none>' });
    }
    if (url.includes('/rss/g1/to/tocantins/')) {
      return new Response(g1SampleXml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
    return new Response('Not Found', { status: 404 });
  }, async () => {
    const req = new Request('https://news.normajuridica.com.br/api/news/7915414156447', {
      headers: { host: 'news.normajuridica.com.br', 'x-api-key': 'test-key' },
    });
    const res = await worker.fetch(req, { API_KEY: 'test-key' }, {} as any);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].title, 'Notícia Tocantins recuperada');
    assert.ok(body._links.self.href.startsWith('https://news.normajuridica.com.br/api/news/7915414156447'));
  });

  // 10c. Simula fallback http:// quando https:// retorna 525
  await withMockedFetch(async (url) => {
    if (url.startsWith('https://')) {
      return new Response('', { status: 525, statusText: '<none>' });
    }
    if (url.startsWith('http://')) {
      return new Response('[{"id":77}]', { status: 200, headers: { 'Content-Type': 'application/json', 'x-wp-total': '1' } });
    }
    return new Response('', { status: 404 });
  }, async () => {
    const res = await resilientFetch('https://tls-broken.example.com/wp-json/wp/v2/posts', 'news.normajuridica.com.br', true);
    assert.equal(res.status, 200);
  });

  // 10d. Valida rotas de favicon e links no HTML do Worker (/ e /docs)
  const icoRes = await worker.fetch(new Request('https://news.normajuridica.com.br/favicon.ico'), {}, {} as any);
  assert.equal(icoRes.status, 200);
  assert.equal(icoRes.headers.get('content-type'), 'image/x-icon');

  const svgRes = await worker.fetch(new Request('https://news.normajuridica.com.br/favicon.svg'), {}, {} as any);
  assert.equal(svgRes.status, 200);
  assert.ok((svgRes.headers.get('content-type') || '').includes('image/svg+xml'));

  const homeRes = await worker.fetch(new Request('https://news.normajuridica.com.br/'), {}, {} as any);
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes('href="/favicon.svg"') && homeHtml.includes('href="/favicon.ico"'));

  const docsRes = await worker.fetch(new Request('https://news.normajuridica.com.br/docs'), {}, {} as any);
  const docsHtml = await docsRes.text();
  assert.ok(docsHtml.includes('href="/favicon.svg"') && docsHtml.includes('href="/favicon.ico"'));

  console.log('  OK: Recuperação 525, domínio news.normajuridica.com.br sem localhost e favicons validados.');
}

async function runAll() {
  await testOriginalNacaoJuridicaFeed();
  await testNormalFetchAndEditorialFiltering();
  await testUserAgentFallbackWithoutGlobalBlocking();
  await testWpApiFallbackToRss();
  await testWpApiMissingTotalHeader();
  await testTimeoutAndRetryWithIndependentAbortControllers();
  await testAtomAndInvalidHtmlRejection();
  await testLastKnownGoodAndRecovery();
  await testWorkersSubrequestBudgetAndLiveComparison();
  await testHttp525RecoveryCustomDomainAndFavicon();
  console.log('\nALL TESTS PASSED!');
}

runAll().catch((err) => {
  console.error('\nTEST FAILURE:', err);
  process.exit(1);
});
