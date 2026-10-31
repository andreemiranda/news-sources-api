'use client';

import { useEffect, useRef, useState } from 'react';

interface SwaggerUIWrapperProps {
  spec?: any;
  url?: string;
}

export default function SwaggerUIWrapper({ spec, url }: SwaggerUIWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    // 1. Ensure Swagger UI CSS is attached
    if (!document.getElementById('swagger-ui-stylesheet')) {
      const link = document.createElement('link');
      link.id = 'swagger-ui-stylesheet';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
      document.head.appendChild(link);
    }

    // 2. Initialize SwaggerUI instance
    const initSwagger = () => {
      if (!isMounted || !containerRef.current) return;
      const win = window as any;
      if (typeof win.SwaggerUIBundle === 'function') {
        try {
          containerRef.current.innerHTML = '';
          win.SwaggerUIBundle({
            domNode: containerRef.current,
            spec: spec || undefined,
            url: !spec ? url || '/api/openapi.json' : undefined,
            deepLinking: true,
            presets: [
              win.SwaggerUIBundle.presets.apis,
              win.SwaggerUIStandalonePreset || (win.SwaggerUIBundle.SwaggerUIStandalonePreset),
            ].filter(Boolean),
            layout: 'BaseLayout',
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'list',
          });
          if (isMounted) {
            setStatus('ready');
          }
        } catch (err: any) {
          console.error('[SwaggerUI] Initialization error:', err);
          if (isMounted) {
            setErrorMessage(err?.message || 'Erro ao inicializar visualizador');
            setStatus('error');
          }
        }
      }
    };

    // If already loaded in window
    if (typeof (window as any).SwaggerUIBundle === 'function') {
      initSwagger();
      return () => {
        isMounted = false;
      };
    }

    // 3. Inject script tag safely
    let script = document.getElementById('swagger-ui-bundle-script') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'swagger-ui-bundle-script';
      script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        initSwagger();
      };
      script.onerror = (e) => {
        console.error('[SwaggerUI] Failed to load SwaggerUIBundle script:', e);
        if (isMounted) {
          setErrorMessage('Falha no carregamento do script do Swagger UI');
          setStatus('error');
        }
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', initSwagger);
    }

    return () => {
      isMounted = false;
      if (script) {
        script.removeEventListener('load', initSwagger);
      }
    };
  }, [spec, url]);

  return (
    <div className="bg-white rounded-lg p-2 min-h-[400px]">
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-700">Carregando documentação interativa Swagger UI...</p>
          <p className="text-xs text-slate-400 mt-1">Carregando esquemas da OpenAPI</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl my-4">
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Não foi possível renderizar o Swagger UI diretamente
          </p>
          {errorMessage && (
            <p className="text-xs text-slate-500 mb-4 font-mono">{errorMessage}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Tentar Novamente
            </button>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Abrir Documentação RapiDoc (/docs)
            </a>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        id="swagger-ui-view"
        className={status === 'ready' ? 'block' : 'hidden'}
      />
    </div>
  );
}
