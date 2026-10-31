import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

import ResizeObserverFix from '@/components/ResizeObserverFix';

export const metadata: Metadata = {
  title: 'News Sources API',
  description: 'API REST para acesso a fontes de notícias brasileiras com documentação interativa via Swagger UI e RapiDoc.',
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
                var suppress = function(e) {
                  var msg = (e && (e.message || (e.error && e.error.message))) || '';
                  if (typeof msg === 'string' && msg.indexOf('ResizeObserver') !== -1) {
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                    if (e.preventDefault) e.preventDefault();
                    return true;
                  }
                };
                window.addEventListener('error', suppress, true);
                if (window.ResizeObserver && !window.__RO_PATCHED__) {
                  var Orig = window.ResizeObserver;
                  window.__RO_PATCHED__ = true;
                  window.ResizeObserver = function(cb) {
                    return new Orig(function(entries, obs) {
                      window.requestAnimationFrame(function() {
                        try { cb(entries, obs); } catch(err) {}
                      });
                    });
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ResizeObserverFix />
        {children}
      </body>
    </html>
  );
}
