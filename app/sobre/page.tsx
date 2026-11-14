import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Globe, Layers, Shield, Zap } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getAllSources, getAllMediaSources, getCategories } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sobre – News & Media Sources API',
  description:
    'Conheça o projeto News & Media Sources API: agregação padronizada de fontes jornalísticas brasileiras, sanitização de conteúdo e documentação interativa.',
  openGraph: {
    title: 'Sobre – News & Media Sources API',
    description:
      'Plataforma de padronização e documentação para fontes de notícias brasileiras e feeds jornalísticos.',
    type: 'website',
  },
};

export default async function AboutPage() {
  const headersList = await headers();
  const reqLike = { headers: headersList } as unknown as Request;
  const sources = getAllSources(reqLike);
  const mediaSources = getAllMediaSources(reqLike);
  const categories = getCategories(reqLike);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <SiteHeader
        title="Sobre o Projeto"
        subtitle="Missão, arquitetura técnica e transparência do News & Media Sources API"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Quem Somos
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            Infraestrutura unificada para leitura e organização de fontes jornalísticas
          </h2>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            O <strong>News &amp; Media Sources API</strong> é uma plataforma web projetada para centralizar, normalizar e documentar fontes públicas de notícias e mídia de todo o Brasil — abrangendo portais regionais, veículos especializados em direito, economia, educação, esportes e tecnologia.
          </p>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            Nosso objetivo é simplificar o trabalho de desenvolvedores, editores e sistemas informativos por meio de respostas estruturadas em JSON (compatíveis com HATEOAS e especificação OpenAPI 3.0.3), além de ferramentas interativas de teste e consulta via Swagger UI e RapiDoc.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 block">Fontes Catalogadas</span>
              <span className="text-2xl font-bold text-blue-600">{sources.length}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 block">Endpoints de Mídia</span>
              <span className="text-2xl font-bold text-emerald-600">{mediaSources.length}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 block">Categorias Ativas</span>
              <span className="text-2xl font-bold text-purple-600">{categories.length}</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Padronização Multi-Protocolo</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Unifica feeds RSS/Atom e REST APIs WordPress em um único contrato previsível com paginação consistente e deduplicação inteligente de imagens.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Alta Disponibilidade</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Execução híbrida em Node.js e Edge Workers com cache inteligente, tolerância a falhas de origem e monitoramento em tempo real.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Documentação Aberta</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Interface interativa na página inicial e em{' '}
              <Link href="/docs" className="text-blue-600 hover:underline font-medium">
                /docs
              </Link>
              , com especificação OpenAPI completa para fácil integração.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Conformidade e Privacidade</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Respeito integral às normas da LGPD e GDPR, com controle de consentimento de cookies e acesso protegido aos endpoints de dados.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
