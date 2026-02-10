import { services, serviceCategories } from '@/lib/data/services';
import ServicesList from '@/components/services/ServicesList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hizmetlerimiz',
  description: 'Botoks, dolgu, lazer epilasyon, PRP ve daha fazlası. Modern teknoloji ve uzman kadromuzla sunduğumuz estetik çözümler.',
  alternates: { canonical: '/hizmetler' },
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 bg-primary-50 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
        <div className="section-container relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
              Hizmetlerimiz
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Güzelliğinizi ve sağlığınızı ön planda tutan, modern teknoloji ve uzman kadromuzla sunduğumuz estetik çözümler.
            </p>
          </div>
        </div>
      </section>

      <ServicesList services={services} categories={serviceCategories} />
    </div>
  );
}
