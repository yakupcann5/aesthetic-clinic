import Link from 'next/link';
import { services } from '@/lib/data/services';
import Card from '@/components/common/Card';
import { ArrowRight, Clock, DollarSign } from 'lucide-react';

export default function FeaturedServices() {
    // Show first 3 services
    const featuredServices = services.slice(0, 3);

    return (
        <section className="section-container bg-white">
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 md:mb-16">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
                    Popüler <span className="gradient-text">Hizmetlerimiz</span>
                </h2>
                <p className="text-base sm:text-lg text-gray-600">
                    En çok tercih edilen estetik uygulamalarımız ile güzelliğinizi ortaya çıkarın
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {featuredServices.map((service, index) => (
                    <Card
                        key={service.id}
                        hover
                        className={`animate-slide-up animation-delay-${index * 200}`}
                    >
                        <div className="space-y-4">
                            {/* Image Placeholder */}
                            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                                <p className="text-gray-500 font-medium">{service.title}</p>
                            </div>

                            {/* Category Badge */}
                            <div className="inline-block px-3 py-1 bg-primary-50 text-primary-600 text-sm font-medium rounded-full">
                                {service.category}
                            </div>

                            {/* Title & Description */}
                            <h3 className="text-2xl font-display font-bold text-gray-900">
                                {service.title}
                            </h3>
                            <p className="text-gray-600 line-clamp-2">
                                {service.shortDescription}
                            </p>

                            {/* Info */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>{service.duration}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm font-semibold text-primary-600">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{service.price}</span>
                                </div>
                            </div>

                            {/* CTA */}
                            <Link
                                href={`/hizmetler/${service.slug}`}
                                className="inline-flex items-center space-x-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors group"
                            >
                                <span>Detaylı Bilgi</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </Card>
                ))}
            </div>

            {/* View All Button */}
            <div className="text-center mt-12">
                <Link href="/hizmetler">
                    <button className="btn-outline">
                        Tüm Hizmetleri Görüntüle
                    </button>
                </Link>
            </div>
        </section>
    );
}
