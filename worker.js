const worker = {
  async fetch(request, env, ctx) {
    // Inject Cloudflare Worker environment variables into process.env and globalThis
    if (env && typeof env === 'object') {
      try {
        if (typeof globalThis !== 'undefined') {
          globalThis.env = env;
          if (env.API_KEY) globalThis.API_KEY = env.API_KEY;
        }
        if (typeof process !== 'undefined' && process.env) {
          for (const [key, value] of Object.entries(env)) {
            if (typeof value === 'string') {
              process.env[key] = value;
            }
          }
        }
      } catch {}
    }

    const url = new URL(request.url);

    // If assets binding is configured, attempt to serve static assets first
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // Health check endpoint directly handled if needed
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          uptime: typeof process !== 'undefined' ? process.uptime?.() || 0 : 0,
          timestamp: new Date().toISOString(),
          platform: 'cloudflare-worker',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      `News & Media Sources API - Running on Cloudflare (${url.pathname})`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  },
};

export default worker;
