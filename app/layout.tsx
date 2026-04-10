import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'Flipa ATM - Localizador de Caixas Multicaixa em Angola',
  description: 'Encontre ATMs com dinheiro e papel em tempo real em Luanda e Angola. A maior rede colaborativa de monitorização de Multicaixas.',
  keywords: ['ATM', 'Multicaixa', 'Angola', 'Luanda', 'Dinheiro', 'Banco', 'Localizador', 'Flipa ATM'],
  authors: [{ name: 'Flipa ATM Team' }],
  openGraph: {
    title: 'Flipa ATM - Localizador de Caixas Multicaixa em Angola',
    description: 'Saiba onde há dinheiro antes de sair de casa. Informação colaborativa em tempo real.',
    type: 'website',
    locale: 'pt_AO',
    siteName: 'Flipa ATM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flipa ATM - Localizador de Multicaixas',
    description: 'Saiba onde há dinheiro em tempo real em Angola.',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'pRJ1dFsjMe4RPZE4nTGF9DwDukGU6BF10Irn-ZHfaQ0',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt">
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
