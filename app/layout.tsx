import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'Flipa ATM - Localizador de Caixas Multicaixa em Angola',
  description: 'Encontre ATMs com dinheiro e papel em tempo real em Luanda e Angola. A maior rede colaborativa de monitorização de Multicaixas.',
  keywords: ['ATM', 'Multicaixa', 'Angola', 'Luanda', 'Dinheiro', 'Banco', 'Localizador', 'Flipa ATM', 'EMIS', 'Multicaixa Express', 'Dinheiro Vivo', 'ATM Angola', 'Caixas Automáticas'],
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
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'finance',
  alternates: {
    canonical: 'https://ais-pre-qf7s6bypdukcb5bwdncfuc-388026503543.europe-west2.run.app',
  },
  verification: {
    google: 'A5fyy81eHYTBWSGrw_9inG-Kao0zLUdXq9nykP8bgxI',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flipa ATM',
  },
  themeColor: '#002244',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Flipa ATM',
    'operatingSystem': 'Web, Android, iOS',
    'applicationCategory': 'FinanceApplication',
    'description': 'Localizador colaborativo de ATMs em Angola com informações em tempo real sobre disponibilidade de dinheiro.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'AOA',
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.8',
      'ratingCount': '1250',
    },
  };

  return (
    <html lang="pt">
      <head>
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
