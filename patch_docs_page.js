const fs = require('fs');
const code = `'use client';

import { useState, useRef, useEffect } from 'react';
import { KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';

export default function DocsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'authorized' | 'error'>('idle');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const rapidocRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('news_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setInputKey(savedKey);
      setStatus('authorized');
    }
  }, []);

  useEffect(() => {
    if (status === 'authorized' && apiKey && rapidocRef.current) {
      const el = rapidocRef.current as any;
      setTimeout(() => {
        if (typeof el.setAttribute === 'function') {
          el.setAttribute('api-key-value', apiKey);
        }
      }, 500);
    }
  }, [apiKey, status, isModalOpen]);

  const handleSaveKey = () => {
    if (!inputKey.trim()) {
      setErrorMessage('A chave de API não pode estar vazia.');
      return;
    }
    setApiKey(inputKey.trim());
    setStatus('authorized');
    setErrorMessage('');
    localStorage.setItem('news_api_key', inputKey.trim());
    setIsModalOpen(false);
  };

  const handleClearKey = () => {
    setApiKey('');
    setInputKey('');
    setStatus('idle');
    localStorage.removeItem('news_api_key');
    setErrorMessage('');
    setIsModalOpen(false);
    if (rapidocRef.current) {
      (rapidocRef.current as any).removeAttribute('api-key-value');
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    handleSaveKey();
  };

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col font-sans">
      <header className="flex-none bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6 shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-none">News Sources API</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Voltar</a>
          {status === 'authorized' ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Autorizado</span>
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors shadow-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Não Autorizado</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full relative overflow-hidden bg-white">
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20 p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Autenticação Necessária</h2>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Esta documentação e seus endpoints são protegidos. Insira sua chave de API para desbloquear a especificação e habilitar os testes interativos.
              </p>
              
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="text-left">
                  <label htmlFor="input-api-key-main" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      id="input-api-key-main"
                      type={showKey ? 'text' : 'password'}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Ex: bn_88feb5baa3f8..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 shadow-sm"
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
                
                <button
                  type="submit"
                  id="btn-submit-key-main"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Desbloquear Documentação</span>
                </button>
              </form>
            </div>
          </div>
        )}

        <div className={\`w-full h-full \${status === 'authorized' ? 'block' : 'hidden'}\`}>
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
            spec-url="/api/openapi.json"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            {/* @ts-ignore */}
          </rapi-doc>
        </div>
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
                  <h3 className="font-semibold text-slate-900 text-base">Autorização da API (API Key)</h3>
                  <p className="text-xs text-slate-500">Configuração de autenticação dos endpoints</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Insira a sua chave de API para desbloquear a visualização da especificação OpenAPI e permitir a execução de testes nos endpoints.
              </p>
              
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              
              {status === 'authorized' && !errorMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Chave ativa e autenticada com sucesso no navegador.</span>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Valor da API Key
                </label>
                <div className="relative">
                  <input
                    id="input-api-key-modal"
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Digite sua chave de API..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 shadow-sm"
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
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-save-key-modal"
                  onClick={() => handleSaveKey()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
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
`;

fs.writeFileSync('app/docs/page.tsx', code);
