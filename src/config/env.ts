/**
 * Centralized, validated environment configuration.
 * Multi-platform safe: works on Vercel, Netlify, Render, Railway, Fly.io,
 * Hostinger Node.js Web App, cPanel (Passenger/Phusion), and Docker containers.
 */

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  API_KEY: string;
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
  const trimmed = raw.trim();

  // 1. JSON format: {"G1": "NormaJurídica", "CNN": "Outro"}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
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
      // Continue to key-value or plain string fallback
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

export function getEnv(): EnvConfig {
  const isServer = typeof window === 'undefined';
  const apiKey = (process.env.API_KEY || '').trim();

  // Warn gracefully in server environment if API_KEY is missing
  if (isServer && !apiKey && process.env.NODE_ENV === 'production') {
    console.warn(
      '[Env Warning] API_KEY environment variable is not defined. Secure endpoints will reject requests until API_KEY is configured in your hosting platform dashboard.'
    );
  }

  return {
    PORT: parsePort(process.env.PORT, 3000),
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    API_KEY: apiKey,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL?.trim(),
    AI_API_KEY: process.env.AI_API_KEY?.trim(),
    AI_ENDPOINT: process.env.AI_ENDPOINT?.trim(),
    AI_MODEL: process.env.AI_MODEL?.trim(),
    G1_REPLACEMENT: process.env.G1_REPLACEMENT?.trim(),
    SOURCE_OWNER_REPLACEMENT: process.env.SOURCE_OWNER_REPLACEMENT?.trim(),
    SOURCE_OWNER_REPLACEMENTS:
      parseReplacementMap(process.env.SOURCE_OWNER_REPLACEMENTS) ||
      parseReplacementMap(process.env.SOURCE_NAME_REPLACEMENTS),
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET?.trim() || 'camara-paraiso-revalidate-secret-token',
    WP_API_URL: (process.env.WP_API_URL || process.env.WORDPRESS_API_URL)?.trim(),
  };
}

export const env = getEnv();
