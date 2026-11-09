import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RuteTrans - Integrasi Transjakarta & Trans Semarang (Live Transit Map)',
  description:
    'RuteTrans — Platform terintegrasi transportasi publik Transjakarta dan Trans Semarang. Pantau rute, koridor, posisi armada live GPS bus, halte, dan navigasi transit antarkota secara interaktif realtime.',
  applicationName: 'RuteTrans',
  authors: [{ name: 'RuteTrans Team' }],
  keywords: [
    'RuteTrans',
    'Transjakarta',
    'Trans Semarang',
    'Transsemarang',
    'Rute Transjakarta',
    'Koridor Trans Semarang',
    'Live Bus Tracking',
    'Mikrotrans',
    'JakLingko',
    'BRT Semarang',
    'Transit Map Real-Time',
    'Integrasi Transportasi Publik',
  ],
  creator: 'RuteTrans',
  publisher: 'RuteTrans',
  metadataBase: new URL('https://rutetrans.local'),
  openGraph: {
    title: 'RuteTrans - Integrasi Transjakarta & Trans Semarang',
    description:
      'Platform terintegrasi transportasi publik Transjakarta dan Trans Semarang. Melacak seluruh koridor rute, live GPS bus tracking, dan jadwal kedatangan armada secara realtime.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'RuteTrans',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RuteTrans - Integrasi Transjakarta & Trans Semarang',
    description:
      'Platform terintegrasi transportasi publik Transjakarta dan Trans Semarang secara realtime.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden bg-slate-50 text-slate-900 antialiased selection:bg-red-600 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
