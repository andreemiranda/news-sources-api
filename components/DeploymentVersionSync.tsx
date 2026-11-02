'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface DeploymentVersionSyncProps {
  serverBuildId?: string;
  checkIntervalMs?: number;
}

const RELOAD_THROTTLE_MS = 15000;
const SESSION_RELOAD_KEY = '__app_version_sync_reload__';

export default function DeploymentVersionSync({
  serverBuildId,
  checkIntervalMs = 60000,
}: DeploymentVersionSyncProps) {
  const router = useRouter();
  const currentBuildIdRef = useRef<string | null>(serverBuildId || null);
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Store initial known buildId
    if (serverBuildId && !currentBuildIdRef.current) {
      currentBuildIdRef.current = serverBuildId;
    }

    // Helper: Safely reload page once to resolve deployment chunk conflicts
    const safelySynchronizeWithServer = (reason: string) => {
      try {
        const lastReload = parseInt(sessionStorage.getItem(SESSION_RELOAD_KEY) || '0', 10);
        const now = Date.now();

        if (now - lastReload > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(SESSION_RELOAD_KEY, now.toString());
          console.info(`[VersionSync] Deployment updated (${reason}). Synchronizing client with server...`);
          // Hard reload from server to fetch fresh chunks & assets
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    };

    // 2. Global Error Listener: Intercept chunk/bundle mismatch errors from old deployments
    const errorHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
      const msg =
        (event instanceof ErrorEvent ? event.message : (event?.reason?.message || event?.reason)) || '';
      const strMsg = typeof msg === 'string' ? msg : String(msg);

      const isDeploymentChunkError =
        strMsg.includes('ChunkLoadError') ||
        strMsg.includes('Loading chunk') ||
        strMsg.includes('Failed to fetch dynamically imported module') ||
        strMsg.includes('Failed to fetch RSC payload') ||
        strMsg.includes('failed to fetch') && strMsg.includes('_next');

      if (isDeploymentChunkError) {
        if ('preventDefault' in event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        safelySynchronizeWithServer('ChunkLoadError from previous deployment');
      }
    };

    window.addEventListener('error', errorHandler as any, true);
    window.addEventListener('unhandledrejection', errorHandler as any);

    // 3. Check server deployment version against client
    const verifyServerVersion = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const res = await fetch(`/api/version?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (res.ok) {
          const data = await res.json();
          const remoteBuildId = data?.buildId;

          if (remoteBuildId) {
            if (!currentBuildIdRef.current) {
              currentBuildIdRef.current = remoteBuildId;
            } else if (currentBuildIdRef.current !== remoteBuildId) {
              console.info(
                `[VersionSync] Client build (${currentBuildIdRef.current}) does not match server deployment (${remoteBuildId}). Updating...`
              );
              currentBuildIdRef.current = remoteBuildId;

              // Don't interrupt user if they are currently typing in a form input
              const activeTag = document.activeElement?.tagName?.toLowerCase();
              const isTyping = activeTag === 'input' || activeTag === 'textarea';

              if (!isTyping) {
                safelySynchronizeWithServer('Deployment build mismatch detected');
              } else {
                // If typing, refresh next-router state softly first
                router.refresh();
              }
            }
          }
        }
      } catch {
        // Silently continue if network is momentarily unavailable
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 4. Initial check if serverBuildId was not pre-populated
    if (!currentBuildIdRef.current) {
      verifyServerVersion();
    }

    // 5. Check on window focus and tab visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyServerVersion();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', verifyServerVersion);

    // 6. Periodic heartbeat check
    const intervalId = setInterval(verifyServerVersion, checkIntervalMs);

    return () => {
      window.removeEventListener('error', errorHandler as any, true);
      window.removeEventListener('unhandledrejection', errorHandler as any);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', verifyServerVersion);
      clearInterval(intervalId);
    };
  }, [serverBuildId, checkIntervalMs, router]);

  return null;
}
