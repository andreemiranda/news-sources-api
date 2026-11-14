import Link from 'next/link';
import { Newspaper, ArrowLeft, BookOpen } from 'lucide-react';

interface SiteHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-md transition-colors shrink-0"
              aria-label="Voltar para a página inicial"
            >
              <Newspaper className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
              {subtitle ? <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{subtitle}</p> : null}
            </div>
          </div>

          <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Início</span>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-colors shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Documentação</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
