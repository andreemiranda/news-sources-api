import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500 text-center sm:text-left">
          &copy; {year} News &amp; Media Sources API. Todos os direitos reservados.
        </p>
        <nav aria-label="Links institucionais e legais" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-600">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Início
          </Link>
          <Link href="/docs" className="hover:text-blue-600 transition-colors">
            Documentação
          </Link>
          <Link href="/sobre" className="hover:text-blue-600 transition-colors">
            Sobre
          </Link>
          <Link href="/contato" className="hover:text-blue-600 transition-colors">
            Contato
          </Link>
          <Link href="/politica-de-privacidade" className="hover:text-blue-600 transition-colors">
            Política de Privacidade
          </Link>
          <Link href="/termos-de-uso" className="hover:text-blue-600 transition-colors">
            Termos de Uso
          </Link>
        </nav>
      </div>
    </footer>
  );
}
