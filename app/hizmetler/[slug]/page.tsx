'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Check, ArrowRight, Calendar, Info, ShieldCheck } from 'lucide-react';
import { getServiceBySlug } from '@/lib/data/services';
import NotFound from '@/app/not-found';

export default function ServiceDetailPage() {
    const params = useParams();
    const service = getServiceBySlug(params.slug as string);

    if (!service) {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Section */}
            <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-gray-900">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent z-10" />
                {/* Placeholder for hero image */}
                <div className="absolute inset-0 bg-gray-800" />

                <div className="section-container relative z-20 text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/20 backdrop-blur-sm border border-primary-500/30 text-primary-200 text-sm font-medium mb-6">
                            {service.category}
                        </span>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6">
                            {service.title}
                        </h1>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                            {service.shortDescription}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-300">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary-400" />
                                {service.duration}
                            </div>
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary-400" />
                                FDA Onaylı
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary-400" />
                                Güvenli İşlem
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <div className="section-container -mt-20 relative z-30">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-8"
                        >
                            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
                                Tedavi Hakkında
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                {service.description}
                            </p>
                        </motion.div>

                        {/* Process Steps */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-8"
                        >
                            <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                                Uygulama Süreci
                            </h2>
                            <div className="space-y-6">
                                {service.process.map((step, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-gray-700 font-medium">{step}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Benefits */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-8"
                        >
                            <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                                Avantajlar
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {service.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className="text-gray-700">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="sticky top-24 space-y-6"
                        >
                            {/* Booking Card */}
                            <div className="glass-card p-6 border-t-4 border-t-primary-500">
                                <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                                    Randevu Oluştur
                                </h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    Uzmanlarımızla görüşmek için hemen randevu alın.
                                </p>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">İşlem Süresi</span>
                                        <span className="font-medium text-gray-900">{service.duration}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Fiyat Aralığı</span>
                                        <span className="font-medium text-primary-600">{service.price}</span>
                                    </div>
                                </div>

                                <Link href="/randevu" className="btn-primary w-full flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Randevu Al
                                </Link>

                                <p className="text-xs text-center text-gray-400 mt-4">
                                    * Fiyatlar kişiye özel konsültasyon sonrası netleşir.
                                </p>
                            </div>

                            {/* Contact Card */}
                            <div className="glass-card p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none">
                                <h3 className="text-lg font-bold mb-2">Sorularınız mı var?</h3>
                                <p className="text-gray-300 text-sm mb-4">
                                    WhatsApp hattımızdan bize ulaşabilirsiniz.
                                </p>
                                <a
                                    href="https://wa.me/905551234567"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 border-none text-white"
                                >
                                    WhatsApp'tan Yaz
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
