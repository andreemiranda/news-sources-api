'use client';

import { useEffect } from 'react';

/**
 * Patch ResizeObserver loop notifications which are benign browser warnings
 * triggered during dynamic layout updates in complex widgets (Swagger UI, RapiDoc).
 */
export default function ResizeObserverFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Debounce ResizeObserver callbacks using requestAnimationFrame to prevent loop limit exceeded
    if (window.ResizeObserver && !(window as any).__RO_PATCHED__) {
      const OriginalRO = window.ResizeObserver;
      (window as any).__RO_PATCHED__ = true;
      (window as any).ResizeObserver = class PatchedResizeObserver extends OriginalRO {
        constructor(callback: ResizeObserverCallback) {
          super((entries, observer) => {
            window.requestAnimationFrame(() => {
              try {
                callback(entries, observer);
              } catch (e) {
                // Ignore layout observer warnings
              }
            });
          });
        }
      };
    }

    // 2. Suppress unhandled ResizeObserver notifications from triggering dev overlay
    const errorHandler = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (
        msg.includes('ResizeObserver loop completed with undelivered notifications') ||
        msg.includes('ResizeObserver loop limit exceeded') ||
        msg.includes('ResizeObserver loop')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener('error', errorHandler, true);

    return () => {
      window.removeEventListener('error', errorHandler, true);
    };
  }, []);

  return null;
}
