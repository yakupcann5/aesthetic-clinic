import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";

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

export const metadata: Metadata = {
  title: "Aesthetic Clinic - Güzellik ve Estetik Merkezi",
  description: "Botoks, dolgu, lazer epilasyon ve daha fazlası için uzman kadromuzla hizmetinizdeyiz. Modern teknoloji ve güvenli uygulamalar.",
  keywords: "estetik, botoks, dolgu, lazer epilasyon, cilt bakımı, PRP, mezoterapi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased bg-gradient-to-br from-primary-50 via-white to-primary-50 text-gray-900 font-sans">
        <Header />
        <main className="pt-20">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
