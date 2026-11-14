import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { formatAppEmail, getBaseDomain } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Política de Privacidade – News & Media Sources API',
  description:
    'Política de Privacidade, uso de cookies do Google AdSense (cookie DART), LGPD e proteção de dados do portal News & Media Sources API.',
  openGraph: {
    title: 'Política de Privacidade – News & Media Sources API',
    description:
      'Saiba como tratamos dados, cookies essenciais, cookies de publicidade do Google AdSense e seus direitos sob a LGPD e GDPR.',
    type: 'website',
  },
};

export default async function PrivacyPolicyPage() {
  const headersList = await headers();
  const reqLike = { headers: headersList } as unknown as Request;
  const contactEmail = formatAppEmail('contato', reqLike);
  const domain = getBaseDomain(reqLike) || 'nosso portal';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <SiteHeader
        title="Política de Privacidade"
        subtitle="Transparência, cookies, Google AdSense e proteção de dados (LGPD / GDPR)"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <article className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          <div className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              Documento Institucional
            </p>
            <h2 className="text-2xl font-bold text-slate-900">
              Política de Privacidade e Uso de Cookies
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Domínio: <span className="font-mono">{domain}</span> &middot; Atualizado em novembro de 2026
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">1. Compromisso com a Privacidade</h3>
            <p className="text-sm sm:text-base">
              A sua privacidade é importante para o <strong>News &amp; Media Sources API</strong>. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos informações quando você navega pelas páginas web informativas e pela documentação interativa disponíveis neste domínio, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e o Regulamento Geral sobre a Proteção de Dados (GDPR).
            </p>
          </section>

          <section className="space-y-3 bg-blue-50/70 border border-blue-200 rounded-xl p-5">
            <h3 className="text-lg font-bold text-slate-900">
              2. Google AdSense, Cookie DART e Cookies de Terceiros
            </h3>
            <p className="text-sm sm:text-base">
              Utilizamos serviços de publicidade de terceiros, incluindo o <strong>Google AdSense</strong>, exclusivamente nas páginas públicas de conteúdo web para viabilizar a manutenção gratuita da plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base">
              <li>
                O Google, como fornecedor de terceiros, utiliza cookies (incluindo o <strong>cookie DART</strong> e identificadores de publicidade) para exibir anúncios neste site com base nas visitas anteriores do usuário a este endereço e a outros sites na Internet.
              </li>
              <li>
                Com a utilização do cookie DART e de cookies de parceiros de publicidade, o Google e seus parceiros podem veicular anúncios mais relevantes de acordo com seus interesses de navegação.
              </li>
              <li>
                Você pode desativar a publicidade personalizada e o uso do cookie DART a qualquer momento acessando as{' '}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline font-medium"
                >
                  Configurações de Anúncios do Google
                </a>{' '}
                ou gerenciando preferências de redes participantes em{' '}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline font-medium"
                >
                  aboutads.info
                </a>
                .
              </li>
              <li>
                Ao selecionar <strong>&quot;Recusar&quot;</strong> no banner de consentimento de cookies exibido no rodapé, sinalizamos a preferência por anúncios não personalizados e registramos sua escolha localmente no navegador.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">3. Armazenamento Local (LocalStorage) e Registros Técnicos</h3>
            <p className="text-sm sm:text-base">
              Nas páginas interativas de documentação (Swagger UI e RapiDoc), podemos utilizar o armazenamento local do seu navegador (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">localStorage</code>) estritamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm sm:text-base">
              <li>
                Guardar sua escolha de consentimento de cookies (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">cookie_consent_status</code>), evitando que o aviso apareça repetidamente.
              </li>
              <li>
                Manter a chave de teste (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">news_api_key</code>) inserida voluntariamente por você no explorador, sem compartilhamento com terceiros.
              </li>
            </ul>
            <p className="text-sm sm:text-base">
              Registros padrão de servidor (como endereço IP, tipo de navegador, data e hora de acesso) podem ser processados temporariamente pela infraestrutura de borda e hospedagem exclusivamente para segurança, prevenção contra abusos e estabilidade operacional.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">4. Seus Direitos (LGPD e GDPR)</h3>
            <p className="text-sm sm:text-base">
              Você tem direito a solicitar confirmação da existência de tratamento, acesso, correção, eliminação ou revogação de consentimento de dados pessoais, bem como limpar cookies diretamente nas configurações do seu navegador.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">5. Contato e Alterações</h3>
            <p className="text-sm sm:text-base">
              Esta política pode ser atualizada periodicamente para refletir melhorias técnicas ou exigências legais. Em caso de dúvidas sobre privacidade ou proteção de dados, entre em contato pelo e-mail{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline font-medium">
                {contactEmail}
              </a>{' '}
              ou pela nossa{' '}
              <Link href="/contato" className="text-blue-600 hover:underline font-medium">
                página de contato
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
