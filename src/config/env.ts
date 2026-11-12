/**
 * Centralized, validated environment configuration.
 * Multi-platform safe: works on Vercel, Netlify, Render, Railway, Fly.io,
 * Hostinger Node.js Web App, cPanel (Passenger/Phusion), and Docker containers.
 */

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  API_KEY: string;
  APP_URL?: string;
  APP_DOMAIN?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_APP_DOMAIN?: string;
  NEXT_PUBLIC_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_ENDPOINT?: string;
  AI_MODEL?: string;
  G1_REPLACEMENT?: string;
  SOURCE_OWNER_REPLACEMENT?: string;
  SOURCE_OWNER_REPLACEMENTS?: Record<string, string>;
  REVALIDATE_SECRET: string;
  WP_API_URL?: string;
}

function parsePort(val: string | undefined, defaultPort = 3000): number {
  if (!val) return defaultPort;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultPort : parsed;
}

function parseReplacementMap(raw: string | undefined): Record<string, string> | undefined {
  if (!raw || !raw.trim()) return undefined;
  let trimmed = raw.trim();

  // Strip wrapping single or double quotes if present (e.g. from environment files or TOML)
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // 1. JSON format: {"G1": "NormaJurídica", "CNN": "Outro"}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      // Fix potential missing quote before comma in JSON values if present
      const normalizedJson = trimmed.replace(/([^\\])"?,(?=\s*"[^"]+":)/g, '$1",');
      const parsed = JSON.parse(normalizedJson);
      if (typeof parsed === 'object' && parsed !== null) {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') result[k.trim().toUpperCase()] = v;
        }
        return result;
      }
    } catch {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          const result: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') result[k.trim().toUpperCase()] = v;
          }
          return result;
        }
      } catch {
        // Continue to key-value fallback
      }
    }
  }

  // 2. Delimited key-value format: G1=NormaJurídica, CNN=Portal or G1:NormaJurídica
  if (trimmed.includes('=') || (trimmed.includes(':') && !trimmed.startsWith('http'))) {
    const pairs = trimmed.split(/[,;\n]+/);
    const result: Record<string, string> = {};
    let hasPair = false;
    for (const pair of pairs) {
      const sep = pair.includes('=') ? '=' : ':';
      const [k, ...rest] = pair.split(sep);
      const key = k?.trim();
      const val = rest.join(sep).trim();
      if (key && val) {
        result[key.toUpperCase()] = val;
        hasPair = true;
      }
    }
    if (hasPair) {
      return result;
    }
  }

  // 3. Plain text replacement string (e.g. "NormaJurídica")
  // Automatically maps as DEFAULT and common source owners
  return {
    DEFAULT: trimmed,
    G1: trimmed,
  };
}

let hasWarnedApiKey = false;

export function getEnv(): EnvConfig {
  const isServer = typeof window === 'undefined';
  const isBuildTime =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    process.env.NEXT_IS_EXPORTING === 'true';

  // Suporte abrangente para API_KEY em múltiplos provedores (Vercel, Netlify, Cloudflare Workers/Pages, cPanel)
  const apiKey = (
    process.env.API_KEY ||
    process.env.CLOUDFLARE_API_KEY ||
    process.env.CF_API_KEY ||
    process.env.api_key ||
    process.env.NEXT_PUBLIC_API_KEY ||
    (typeof globalThis !== 'undefined' && (globalThis as any).API_KEY) ||
    (typeof globalThis !== 'undefined' && (globalThis as any).env?.API_KEY) ||
    ''
  ).trim();

  // Alerta amigável apenas em tempo de execução no servidor se a chave estiver ausente (nunca polui o log durante o build)
  if (isServer && !isBuildTime && !apiKey && process.env.NODE_ENV === 'production' && !hasWarnedApiKey) {
    hasWarnedApiKey = true;
    console.warn(
      '[Env Info] API_KEY não detectada nas variáveis de ambiente. Endpoints protegidos exigirão a chave cadastrada no dashboard da sua plataforma.'
    );
  }

  return {
    PORT: parsePort(process.env.PORT, 3000),
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    // Máxima segurança: segredos nunca são expostos no ambiente do cliente (browser)
    API_KEY: isServer ? apiKey : '',
    APP_URL: (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.CF_PAGES_URL
    )?.trim(),
    APP_DOMAIN: (
      process.env.APP_DOMAIN ||
      process.env.NEXT_PUBLIC_APP_DOMAIN ||
      (process.env.CF_PAGES_URL ? process.env.CF_PAGES_URL.replace(/^https?:\/\//, '').split('/')[0] : undefined)
    )?.trim(),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim(),
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN?.trim(),
    NEXT_PUBLIC_BASE_URL: (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.CF_PAGES_URL
    )?.trim(),
    AI_API_KEY: isServer ? process.env.AI_API_KEY?.trim() : undefined,
    AI_ENDPOINT: isServer ? process.env.AI_ENDPOINT?.trim() : undefined,
    AI_MODEL: isServer ? process.env.AI_MODEL?.trim() : undefined,
    G1_REPLACEMENT: isServer ? process.env.G1_REPLACEMENT?.trim() : undefined,
    SOURCE_OWNER_REPLACEMENT: isServer ? process.env.SOURCE_OWNER_REPLACEMENT?.trim() : undefined,
    SOURCE_OWNER_REPLACEMENTS: isServer
      ? (parseReplacementMap(process.env.SOURCE_OWNER_REPLACEMENTS) || parseReplacementMap(process.env.SOURCE_NAME_REPLACEMENTS))
      : undefined,
    REVALIDATE_SECRET: isServer
      ? (
          process.env.REVALIDATE_SECRET ||
          process.env.revalidate_secret ||
          (typeof globalThis !== 'undefined' && (globalThis as any).REVALIDATE_SECRET) ||
          (typeof globalThis !== 'undefined' && (globalThis as any).env?.REVALIDATE_SECRET) ||
          ''
        ).trim()
      : '',
    WP_API_URL: (process.env.WP_API_URL || process.env.WORDPRESS_API_URL)?.trim(),
  };
}

export const env = getEnv();
