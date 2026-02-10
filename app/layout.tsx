import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aestheticclinic.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Aesthetic Clinic - Güzellik ve Estetik Merkezi | İstanbul',
    template: '%s | Aesthetic Clinic',
  },
  description: 'Botoks, dolgu, lazer epilasyon ve daha fazlası için uzman kadromuzla hizmetinizdeyiz. Modern teknoloji ve güvenli uygulamalar.',
  keywords: ['estetik', 'botoks', 'dolgu', 'lazer epilasyon', 'cilt bakımı', 'PRP', 'mezoterapi', 'İstanbul', 'Kadıköy'],
  authors: [{ name: 'Aesthetic Clinic' }],
  creator: 'Aesthetic Clinic',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Aesthetic Clinic',
    title: 'Aesthetic Clinic - Güzellik ve Estetik Merkezi',
    description: 'Botoks, dolgu, lazer epilasyon ve daha fazlası için uzman kadromuzla hizmetinizdeyiz.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aesthetic Clinic - Güzellik ve Estetik Merkezi',
    description: 'Botoks, dolgu, lazer epilasyon ve daha fazlası için uzman kadromuzla hizmetinizdeyiz.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased bg-gradient-to-br from-primary-50 via-white to-primary-50 text-gray-900 font-sans">
        {children}
      </body>
    </html>
  );
}
