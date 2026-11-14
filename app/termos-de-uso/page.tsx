import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { formatAppEmail } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Termos de Uso – News & Media Sources API',
  description:
    'Termos e condições gerais de uso do portal, documentação interativa e serviços disponibilizados pelo News & Media Sources API.',
  openGraph: {
    title: 'Termos de Uso – News & Media Sources API',
    description:
      'Condições de acesso, direitos autorais, limitações de responsabilidade e regras de uso da plataforma.',
    type: 'website',
  },
};

export default async function TermsOfUsePage() {
  const headersList = await headers();
  const reqLike = { headers: headersList } as unknown as Request;
  const contactEmail = formatAppEmail('contato', reqLike);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <SiteHeader
        title="Termos de Uso"
        subtitle="Condições gerais de utilização do portal e da documentação interativa"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <article className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              Documento Legal
            </p>
            <h2 className="text-2xl font-bold text-slate-900">Termos e Condições de Uso</h2>
            <p className="text-xs text-slate-500 mt-2">Atualizado em novembro de 2026</p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">1. Aceitação dos Termos</h3>
            <p className="text-sm sm:text-base">
              Ao acessar e utilizar o portal web e a documentação do <strong>News &amp; Media Sources API</strong>, você concorda integralmente com estes Termos de Uso e com nossa{' '}
              <Link href="/politica-de-privacidade" className="text-blue-600 hover:underline font-medium">
                Política de Privacidade
              </Link>
              . Caso não concorde com qualquer disposição, recomendamos que interrompa o uso do site.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">2. Finalidade do Serviço</h3>
            <p className="text-sm sm:text-base">
              A plataforma oferece interface de consulta, catálogo estruturado e documentação técnica (Swagger UI e RapiDoc) para integração de fontes jornalísticas públicas em formato padronizado, destinadas a desenvolvedores, editores e pesquisadores.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">3. Uso Permitido e Segurança</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                O acesso aos endpoints autenticados exige credencial válida emitida pelo administrador do ambiente.
              </li>
              <li>
                É proibido realizar tentativas de invasão, sobrecarga automatizada abusiva (DoS/DDoS), varreduras não autorizadas ou contornar mecanismos de autenticação e limitação de taxa.
              </li>
              <li>
                O uso de conteúdos jornalísticos indexados deve respeitar os direitos autorais, créditos e políticas editoriais dos respectivos portais de origem.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">4. Disponibilidade e Isenção de Garantias</h3>
            <p className="text-sm sm:text-base">
              Empregamos boas práticas de cache, redundância e tolerância a falhas para manter o serviço disponível continuamente. Contudo, a disponibilidade dos dados em tempo real depende também da estabilidade dos servidores externos de origem, não havendo garantia de funcionamento ininterrupto ou livre de erros.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">5. Links Externos e Publicidade</h3>
            <p className="text-sm sm:text-base">
              Este portal pode exibir anúncios automatizados gerenciados pelo Google AdSense e conter referências a sites externos. Não nos responsabilizamos pelo conteúdo, práticas de privacidade ou disponibilidade de domínios de terceiros.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">6. Legislação Aplicável e Contato</h3>
            <p className="text-sm sm:text-base">
              Estes termos são regidos pelas leis da República Federativa do Brasil. Dúvidas ou solicitações podem ser encaminhadas para{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline font-medium">
                {contactEmail}
              </a>{' '}
              ou pela página{' '}
              <Link href="/contato" className="text-blue-600 hover:underline font-medium">
                /contato
              </Link>
              .
            </p>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
