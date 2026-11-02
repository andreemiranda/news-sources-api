/**
 * Centralized Application Versioning & Deployment Synchronization Configuration
 */

export const APP_VERSION = '1.0.0';

export function getBuildId(): string {
  if (process.env.BUILD_ID && process.env.BUILD_ID.trim()) {
    return process.env.BUILD_ID.trim();
  }
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  if (process.env.RENDER_GIT_COMMIT) {
    return process.env.RENDER_GIT_COMMIT.slice(0, 12);
  }
  if (process.env.RAILWAY_GIT_COMMIT_SHA) {
    return process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 12);
  }
  return `v${APP_VERSION}-${process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}`;
}

export const BUILD_ID = getBuildId();
export const DEPLOYMENT_TIME = process.env.DEPLOYMENT_TIME || new Date().toISOString();
