'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { galleryItems, galleryCategories } from '@/lib/data/gallery';
import { cn } from '@/lib/utils';
import { X, ZoomIn } from 'lucide-react';

export default function GalleryPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedImage, setSelectedImage] = useState<typeof galleryItems[0] | null>(null);

    const filteredItems = selectedCategory === 'all'
        ? galleryItems
        : galleryItems.filter(item => item.category === selectedCategory);

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Section */}
            <section className="py-20 bg-primary-50">
                <div className="section-container text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-6">
                            Öncesi & Sonrası
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Hastalarımızın değişim hikayelerine tanık olun. Gerçek sonuçlar, gerçek mutluluklar.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Filter Section */}
            <section className="py-8 border-b border-gray-100 bg-white">
                <div className="section-container py-0">
                    <div className="flex flex-wrap justify-center gap-4">
                        {galleryCategories.map((category) => (
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

            {/* Gallery Grid */}
            <section className="section-container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="group cursor-pointer"
                                onClick={() => setSelectedImage(item)}
                            >
                                <div className="glass-card overflow-hidden relative aspect-[4/3]">
                                    {/* Before/After Split View Placeholder */}
                                    <div className="absolute inset-0 flex">
                                        <div className="w-1/2 bg-gray-200 relative border-r border-white/20">
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white">Öncesi</div>
                                        </div>
                                        <div className="w-1/2 bg-gray-300 relative">
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-primary-600/80 backdrop-blur-sm rounded text-xs text-white">Sonrası</div>
                                        </div>
                                    </div>

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 text-center text-white p-4">
                                            <ZoomIn className="w-8 h-8 mx-auto mb-2" />
                                            <h3 className="font-bold text-lg">{item.title}</h3>
                                            <p className="text-sm opacity-90">{item.service}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </section>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <div
                            className="max-w-5xl w-full bg-white rounded-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 h-[60vh] md:h-[70vh]">
                                <div className="relative bg-gray-100 flex items-center justify-center border-r border-gray-200">
                                    <span className="absolute top-4 left-4 px-3 py-1 bg-black/50 text-white rounded-full text-sm">Öncesi</span>
                                    <p className="text-gray-400">Görsel Yükleniyor...</p>
                                </div>
                                <div className="relative bg-gray-100 flex items-center justify-center">
                                    <span className="absolute top-4 right-4 px-3 py-1 bg-primary-600 text-white rounded-full text-sm">Sonrası</span>
                                    <p className="text-gray-400">Görsel Yükleniyor...</p>
                                </div>
                            </div>
                            <div className="p-6 bg-white">
                                <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
                                    {selectedImage.title}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <span className="px-3 py-1 bg-gray-100 rounded-full">
                                        {galleryCategories.find(c => c.value === selectedImage.category)?.label}
                                    </span>
                                    <span>{selectedImage.date}</span>
                                </div>
                                <p className="text-gray-600">
                                    {selectedImage.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
