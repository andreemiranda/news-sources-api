import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

import ResizeObserverFix from '@/components/ResizeObserverFix';
import DeploymentVersionSync from '@/components/DeploymentVersionSync';
import { BUILD_ID } from '@/src/config/version';

export const metadata: Metadata = {
  title: 'News Sources API',
  description: 'API REST para acesso a fontes de notícias brasileiras com documentação interativa via Swagger UI e RapiDoc.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'News Sources API',
    description: 'API REST para acesso a fontes de notícias brasileiras com documentação interativa via Swagger UI e RapiDoc.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Immediately eliminate FOUC hidden body style
                try {
                  var removeFouc = function() {
                    var el = document.querySelector('style[data-next-hide-fouc]');
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                    if (document.body) {
                      document.body.style.display = 'block';
                      document.body.style.visibility = 'visible';
                    }
                  };
                  removeFouc();
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', removeFouc);
                  }
                } catch(e) {}

                // 2. Safely intercept deployment chunk mismatch errors without crashing on restricted storage
                var reloadKey = '__app_version_sync_reload__';
                var handleChunkError = function(e) {
                  try {
                    var msg = (e && (e.message || (e.error && e.error.message))) || '';
                    if (typeof msg === 'string' && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1)) {
                      var last = 0;
                      try {
                        last = parseInt(window.sessionStorage ? window.sessionStorage.getItem(reloadKey) || '0' : '0', 10);
                      } catch(err) {}
                      if (Date.now() - last > 15000) {
                        try {
                          if (window.sessionStorage) window.sessionStorage.setItem(reloadKey, String(Date.now()));
                        } catch(err) {}
                        window.location.reload();
                      }
                    }
                  } catch(err) {}
                };
                window.addEventListener('error', handleChunkError, true);

                // 3. Suppress benign ResizeObserver notifications without modifying native prototype
                var suppress = function(e) {
                  try {
                    var msg = (e && (e.message || (e.error && e.error.message))) || '';
                    if (typeof msg === 'string' && (msg.indexOf('ResizeObserver') !== -1)) {
                      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                      if (e.preventDefault) e.preventDefault();
                      return true;
                    }
                  } catch(err) {}
                };
                window.addEventListener('error', suppress, true);
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ResizeObserverFix />
        <DeploymentVersionSync serverBuildId={BUILD_ID} />
        {children}
      </body>
    </html>
  );
}
