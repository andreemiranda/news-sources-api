import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Mail, Clock, ShieldCheck } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import { formatAppEmail, getBaseDomain } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contato – News & Media Sources API',
  description:
    'Entre em contato com a equipe responsável pelo News & Media Sources API para suporte técnico, dúvidas sobre integração ou solicitações de privacidade.',
  openGraph: {
    title: 'Contato – News & Media Sources API',
    description:
      'Canal oficial de atendimento para suporte técnico, parcerias e privacidade.',
    type: 'website',
  },
};

export default async function ContactPage() {
  const headersList = await headers();
  const reqLike = { headers: headersList } as unknown as Request;
  const contactEmail = formatAppEmail('contato', reqLike);
  const baseDomain = getBaseDomain(reqLike) || 'Portal Web';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <SiteHeader
        title="Contato"
        subtitle="Fale conosco sobre suporte técnico, parcerias e privacidade"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Envie uma mensagem</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Preencha o formulário abaixo para entrar em contato com nossa equipe editorial e técnica.
            </p>
            <ContactForm contactEmail={contactEmail} />
          </div>

          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
              <h3 className="font-bold text-slate-900 text-base">Canais Diretos</h3>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    E-mail Oficial
                  </span>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-sm font-medium text-blue-600 hover:underline break-all"
                  >
                    {contactEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Atendimento
                  </span>
                  <p className="text-sm text-slate-700">
                    Segunda a sexta-feira, das 08h às 18h (horário de Brasília)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Privacidade &amp; LGPD
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Consulte nossa{' '}
                    <Link href="/politica-de-privacidade" className="text-blue-600 hover:underline font-medium">
                      Política de Privacidade
                    </Link>{' '}
                    ou <Link href="/termos-de-uso" className="text-blue-600 hover:underline font-medium">Termos de Uso</Link>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 text-xs space-y-2">
              <p className="font-semibold text-white">Ambiente Ativo</p>
              <p className="font-mono text-blue-300 break-all">{baseDomain}</p>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
