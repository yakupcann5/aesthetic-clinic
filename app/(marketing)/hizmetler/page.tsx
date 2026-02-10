import Link from 'next/link';
import { ArrowRight, Clock, Check } from 'lucide-react';
import { services, serviceCategories } from '@/lib/data/services';
import CategoryFilter from '@/components/common/CategoryFilter';
import type { Metadata } from 'next';
import type { Service } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Hizmetlerimiz',
  description: 'Botoks, dolgu, lazer epilasyon, PRP ve daha fazlası. Modern teknoloji ve uzman kadromuzla sunduğumuz estetik çözümler.',
  alternates: { canonical: '/hizmetler' },
};

function ServiceCard({ service }: { service: Service }) {
  return (
    <Link href={`/hizmetler/${service.slug}`} className="group block h-full">
      <div className="glass-card h-full overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
        {/* Image */}
        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
          <div className="absolute inset-0 bg-gray-200" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="flex items-center justify-between text-white">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                {serviceCategories.find(c => c.value === service.category)?.label}
              </span>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="w-4 h-4" />
                {service.duration}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-display font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-primary-600 transition-colors">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {service.shortDescription}
          </p>

          <div className="space-y-2 mb-6">
            {service.benefits.slice(0, 3).map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                <Check className="w-4 h-4 text-primary-500" />
                {benefit}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-primary-600 font-bold">
              {service.price}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-gray-900 group-hover:translate-x-1 transition-transform">
              Detaylı Bilgi
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

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

      <CategoryFilter
        categories={serviceCategories}
        items={services}
        filterKey="category"
        renderItems={(filteredServices) => (
          <section className="section-container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        )}
      />
    </div>
  );
}
