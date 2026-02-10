import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import FeaturedServices from '@/components/home/FeaturedServices';
import Statistics from '@/components/home/Statistics';
import Testimonials from '@/components/home/Testimonials';

export const metadata: Metadata = {
  title: 'Aesthetic Clinic - Güzellik ve Estetik Merkezi | İstanbul',
  description: 'İstanbul Kadıköy\'de botoks, dolgu, lazer epilasyon, PRP ve profesyonel cilt bakımı hizmetleri. 15.000+ mutlu müşteri, %98 memnuniyet oranı.',
  openGraph: {
    title: 'Aesthetic Clinic - Güzellik ve Estetik Merkezi',
    description: 'Modern teknoloji ve uzman kadromuzla botoks, dolgu, lazer epilasyon ve daha fazlası. Güvenli, etkili ve doğal sonuçlar.',
    type: 'website',
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedServices />
      <Statistics />
      <Testimonials />
    </>
  );
}
