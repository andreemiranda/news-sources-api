import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'News Sources API',
  description: 'API REST para acesso a fontes de notícias brasileiras com documentação interativa via Swagger UI e RapiDoc.',
  openGraph: {
    title: 'News Sources API',
    description: 'API REST para acesso a fontes de notícias brasileiras com documentação interativa via Swagger UI e RapiDoc.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
