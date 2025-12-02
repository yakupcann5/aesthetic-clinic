'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Check } from 'lucide-react';
import { services, serviceCategories } from '@/lib/data/services';
import { cn } from '@/lib/utils';

export default function ServicesPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredServices = selectedCategory === 'all'
        ? services
        : services.filter(service => service.category === selectedCategory);

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Section */}
            <section className="relative py-20 bg-primary-50 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5" />
                <div className="section-container relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-6">
                            Hizmetlerimiz
                        </h1>
                        <p className="text-lg text-gray-600">
                            Güzelliğinizi ve sağlığınızı ön planda tutan, modern teknoloji ve uzman kadromuzla sunduğumuz estetik çözümler.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Filter Section */}
            <section className="py-8 border-b border-gray-100 bg-white">
                <div className="section-container py-0">
                    <div className="flex flex-wrap justify-center gap-4">
                        {serviceCategories.map((category) => (
                            <button
                                key={category.value}
                                onClick={() => setSelectedCategory(category.value)}
                                className={cn(
                                    "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                    selectedCategory === category.value
                                        ? "bg-primary-600 text-white shadow-lg scale-105"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="section-container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredServices.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Link href={`/hizmetler/${service.slug}`} className="group block h-full">
                                <div className="glass-card h-full overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                                    {/* Image */}
                                    <div className="relative h-64 overflow-hidden">
                                        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                                        {/* Placeholder for actual image */}
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
                                    <div className="p-6">
                                        <h3 className="text-xl font-display font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
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
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}
