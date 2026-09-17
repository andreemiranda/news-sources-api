'use client';

import { useState, useRef, useEffect } from 'react';
import { KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DocsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const rapidocRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const savedKey = localStorage.getItem('news_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setInputKey(savedKey);
    }

    // Ensure RapiDoc web component script is loaded
    if (typeof window !== 'undefined' && !customElements.get('rapi-doc')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/rapidoc/dist/rapidoc-min.js';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (apiKey && rapidocRef.current) {
      const el = rapidocRef.current as any;
      try {
        if (typeof el.setAttribute === 'function') {
          el.setAttribute('api-key-value', apiKey);
        }
        if (typeof el.setApiKey === 'function') {
          el.setApiKey('ApiKeyAuth', apiKey);
          el.setApiKey('BearerAuth', apiKey);
          el.setApiKey('QueryApiKey', apiKey);
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }, [apiKey, isMounted]);

  const handleSaveKey = () => {
    if (!inputKey.trim()) {
      setErrorMessage('A chave de API não pode estar vazia.');
      return;
    }
    const cleanKey = inputKey.trim();
    setApiKey(cleanKey);
    setErrorMessage('');
    localStorage.setItem('news_api_key', cleanKey);
    setIsModalOpen(false);

    if (rapidocRef.current) {
      const el = rapidocRef.current as any;
      try {
        el.setAttribute('api-key-value', cleanKey);
        if (typeof el.setApiKey === 'function') {
          el.setApiKey('ApiKeyAuth', cleanKey);
          el.setApiKey('BearerAuth', cleanKey);
        }
      } catch (e) {}
    }
  };

  const handleClearKey = () => {
    setApiKey('');
    setInputKey('');
    localStorage.removeItem('news_api_key');
    setErrorMessage('');
    setIsModalOpen(false);
    if (rapidocRef.current) {
      try {
        (rapidocRef.current as any).removeAttribute('api-key-value');
      } catch (e) {}
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveKey();
  };

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Navigation Header */}
      <header className="flex-none bg-slate-900 border-b border-slate-800 h-14 flex items-center justify-between px-4 sm:px-6 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Swagger</span>
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              RD
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                News & Media Sources API
              </h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wider mt-0.5">
                RapiDoc Documentation &middot; example.com
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {apiKey ? (
            <button
              onClick={() => setIsModalOpen(true)}
              id="btn-auth-status"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 hover:bg-emerald-900/80 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chave Configurada</span>
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              id="btn-auth-status"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 hover:bg-amber-900/80 transition-all shadow-sm animate-pulse"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Inserir API Key</span>
            </button>
          )}

          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white transition-colors hidden md:flex items-center gap-1"
          >
            <span>OpenAPI Spec</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Documentation Area */}
      <main className="flex-1 w-full relative overflow-hidden bg-white">
        {isMounted ? (
          /* @ts-ignore */
          <rapi-doc
            id="rapidoc-el"
            ref={rapidocRef}
            theme="light"
            render-style="read"
            show-header="false"
            show-info="true"
            allow-server-selection="true"
            allow-authentication="true"
            allow-try="true"
            heading-text="News & Media Sources API"
            primary-color="#2563eb"
            bg-color="#ffffff"
            text-color="#1e293b"
            nav-bg-color="#f8fafc"
            nav-text-color="#334155"
            nav-hover-bg-color="#e2e8f0"
            nav-hover-text-color="#0f172a"
            nav-accent-color="#2563eb"
            api-key-name="x-api-key"
            api-key-location="header"
            api-key-value={apiKey}
            spec-url="/api/openapi.json"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            {/* @ts-ignore */}
          </rapi-doc>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="text-slate-500 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Carregando documentação interativa...</span>
            </div>
          </div>
        )}
      </main>

      {/* Authorize Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div
            className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">Autenticação necessária</h3>
                  <p className="text-xs text-slate-500">Configuração de credenciais para testes nos endpoints</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Para testar os endpoints no RapiDoc / Swagger UI, insira a sua API Key. A chave pode ser enviada via header <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>, header <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">x-api-key</code>, ou query parameter <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">?api_key=&lt;key&gt;</code>.
                </p>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {apiKey && !errorMessage && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Chave configurada e ativa no navegador.</span>
                  </div>
                )}

                <div>
                  <label htmlFor="input-modal-key" className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Valor da API Key
                  </label>
                  <div className="relative">
                    <input
                      id="input-modal-key"
                      type={showKey ? 'text' : 'password'}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Digite sua chave de API..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 shadow-sm font-mono"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                {apiKey ? (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remover Chave
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    id="btn-save-key-modal"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Salvar e Autorizar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
