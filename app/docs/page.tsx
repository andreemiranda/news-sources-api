'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { Lock, Unlock, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function RapiDocPage() {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'authorized' | 'unauthorized'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [specData, setSpecData] = useState<object | null>(null);

  const rapidocRef = useRef<HTMLElement | null>(null);

  const validateAndLoadSpec = useCallback(async (key: string) => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`/openapi.json?api_key=${encodeURIComponent(key)}`, {
        headers: {
          'x-api-key': key,
          Authorization: `Bearer ${key}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSpecData(data);
        setStatus('authorized');
        localStorage.setItem('news_sources_api_key', key);
        setApiKey(key);
        setIsModalOpen(false);

        // Feed spec directly to RapiDoc element if available
        setTimeout(() => {
          const el = document.getElementById('rapidoc-el') as any;
          if (el && typeof el.loadSpec === 'function') {
            el.loadSpec(data);
          }
        }, 150);
      } else {
        if (response.status === 401) {
          setStatus('unauthorized');
          setErrorMessage('Chave de API inválida ou não autorizada (401). Verifique a chave informada.');
        } else {
          setStatus('unauthorized');
          setErrorMessage(`Erro ao carregar especificação (${response.status}). Tente novamente.`);
        }
      }
    } catch (err: any) {
      setStatus('unauthorized');
      setErrorMessage('Falha ao conectar com o servidor da API. Verifique sua conexão.');
    }
  }, []);

  // Load saved key from localStorage or URL parameter on mount
  useEffect(() => {
    setMounted(true);
    const urlParams = new URLSearchParams(window.location.search);
    const queryKey = urlParams.get('api_key') || urlParams.get('apiKey');
    const storedKey = localStorage.getItem('news_sources_api_key') || localStorage.getItem('api_key');

    const keyToUse = queryKey || storedKey || '';
    if (keyToUse) {
      setApiKey(keyToUse);
      setInputKey(keyToUse);
      validateAndLoadSpec(keyToUse);
    } else {
      setStatus('unauthorized');
    }
  }, [validateAndLoadSpec]);

  // When script loads and we already have specData, inject it
  useEffect(() => {
    if (scriptLoaded && specData) {
      const el = document.getElementById('rapidoc-el') as any;
      if (el && typeof el.loadSpec === 'function') {
        el.loadSpec(specData);
      }
    }
  }, [scriptLoaded, specData]);

  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      setErrorMessage('Por favor, digite uma API Key.');
      return;
    }
    validateAndLoadSpec(cleanKey);
  };

  const handleClearKey = () => {
    localStorage.removeItem('news_sources_api_key');
    localStorage.removeItem('api_key');
    setApiKey('');
    setInputKey('');
    setSpecData(null);
    setStatus('unauthorized');
    setErrorMessage('');
  };

  if (!mounted) return null;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-slate-100 font-sans">
      <Script
        type="module"
        src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* Top Navigation Header */}
      <header className="bg-slate-800/95 backdrop-blur border-b border-slate-700 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            id="btn-back-home"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-700/70 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors border border-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Início</span>
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Documentação completa
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
              RapiDoc
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Authorize button */}
          <button
            id="btn-authorize"
            onClick={() => {
              setInputKey(apiKey);
              setErrorMessage('');
              setIsModalOpen(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all shadow-sm ${
              status === 'authorized'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40'
                : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/40 animate-pulse'
            }`}
          >
            {status === 'authorized' ? (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-100" />
                <span>Autorizado</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-100" />
                <span>Autorizar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Documentation Area */}
      <main className="flex-grow w-full relative overflow-hidden bg-white">
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm text-slate-200">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-sm font-medium">Validando chave e carregando documentação completa...</p>
          </div>
        )}

        {status === 'unauthorized' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900 p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-6 sm:p-8">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-center text-white mb-2">
                Autenticação Necessária
              </h2>
              <p className="text-sm text-slate-300 text-center mb-6 leading-relaxed">
                Esta API e sua especificação OpenAPI estão protegidas por chave de API. Informe sua chave abaixo para desbloquear e visualizar a documentação completa.
              </p>

              {errorMessage && (
                <div className="mb-5 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      id="input-api-key-main"
                      type={showKey ? 'text' : 'password'}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Ex: bn_88feb5baa3f8..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-submit-key-main"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-600/30"
                >
                  <Lock className="w-4 h-4" />
                  <span>Desbloquear Documentação</span>
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
                <p className="text-xs text-slate-400">
                  Formas de envio aceitas: <code className="text-slate-300">x-api-key</code>, <code className="text-slate-300">Authorization: Bearer</code> ou <code className="text-slate-300">?api_key=</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RapiDoc Web Component */}
        <div className={`w-full h-full ${status === 'authorized' ? 'block' : 'hidden'}`}>
          {/* @ts-ignore */}
          <rapi-doc
            id="rapidoc-el"
            ref={rapidocRef}
            theme="light"
            render-style="read"
            show-header="false"
            allow-server-selection="false"
            allow-authentication="true"
            allow-try="true"
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
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            {/* @ts-ignore */}
          </rapi-doc>
        </div>
      </main>

      {/* Authorize Modal Dialog (Swagger-style) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div
            className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Autorização da API (API Key)</h3>
                  <p className="text-xs text-slate-400">Configuração de autenticação dos endpoints</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Insira a sua chave de API para desbloquear a visualização da especificação OpenAPI e permitir a execução de testes nos endpoints.
              </p>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {status === 'authorized' && !errorMessage && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chave ativa e autenticada com sucesso no servidor.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Valor da API Key
                </label>
                <div className="relative">
                  <input
                    id="input-api-key-modal"
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Digite sua chave de API..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 text-xs space-y-1 text-slate-400">
                <div className="font-medium text-slate-300">Métodos aceitos:</div>
                <div>• Header: <code className="text-slate-300">x-api-key: &lt;sua-chave&gt;</code></div>
                <div>• Header: <code className="text-slate-300">Authorization: Bearer &lt;sua-chave&gt;</code></div>
                <div>• Query Param: <code className="text-slate-300">?api_key=&lt;sua-chave&gt;</code></div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between">
              {apiKey ? (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
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
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-save-key-modal"
                  onClick={() => handleSaveKey()}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                >
                  Salvar e Autorizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
