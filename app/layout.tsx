import type { Metadata } from 'next';
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'No Limit — Centre de médecine naturelle · Cameroun',
  description: 'No Limit — Centre de médecine naturelle à Douala, Yaoundé et Bafoussam. Naturopathie, acupuncture, sophrologie, massages thérapeutiques.',
  metadataBase: new URL('https://nolimit.cm'),
  openGraph: {
    title: 'No Limit — Médecine naturelle · Cameroun',
    description: 'Naturopathie, acupuncture, sophrologie et thérapies manuelles à Douala, Yaoundé et Bafoussam.',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div id="cursor" />
        {children}
      </body>
    </html>
  );
}
