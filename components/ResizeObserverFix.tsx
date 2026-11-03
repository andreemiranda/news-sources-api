'use client';

import { useEffect } from 'react';

/**
 * Patch ResizeObserver loop notifications which are benign browser warnings
 * triggered during dynamic layout updates in complex widgets (Swagger UI, RapiDoc).
 */
export default function ResizeObserverFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Suppress unhandled benign ResizeObserver notifications from triggering dev overlay
    // Do not subclass or replace window.ResizeObserver constructor, as it breaks libraries relying on native prototypes
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
