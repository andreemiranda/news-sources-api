'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent_status';
const STORAGE_DATE_KEY = 'cookie_consent_updated_at';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'rejected') {
        const w = window as any;
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.requestNonPersonalizedAds = 1;
      }
      if (saved !== 'accepted' && saved !== 'rejected') {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDecision = (status: 'accepted' | 'rejected') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, status);
      window.localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString());
      if (status === 'rejected') {
        const w = window as any;
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.requestNonPersonalizedAds = 1;
      }
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      id="cookie-consent-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de Cookies e Privacidade"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pointer-events-none"
    >
      <div className="max-w-5xl mx-auto pointer-events-auto bg-slate-900/95 backdrop-blur-md text-slate-100 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0 mt-0.5">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Privacidade e Cookies (LGPD / GDPR)</span>
              </p>
              <p>
                Utilizamos cookies essenciais e de terceiros (incluindo Google AdSense) para melhorar sua experiência de navegação e exibir anúncios relevantes. Ao clicar em &quot;Aceitar&quot;, você concorda com o uso descrito em nossa{' '}
                <Link
                  href="/politica-de-privacidade"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 justify-end">
            <button
              type="button"
              id="btn-cookie-reject"
              onClick={() => handleDecision('rejected')}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
            >
              Recusar
            </button>
            <button
              type="button"
              id="btn-cookie-accept"
              onClick={() => handleDecision('accepted')}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              Aceitar
            </button>
            <button
              type="button"
              aria-label="Fechar aviso recusando cookies opcionais"
              onClick={() => handleDecision('rejected')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:inline-flex"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
