'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Check, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import type { Product } from '@/lib/types';

export default function ProductDetail({ product }: { product: Product }) {
    const [quantity, setQuantity] = useState(1);

    return (
        <div className="min-h-screen pb-20 pt-10">
            <div className="section-container">
                <Link
                    href="/urunler"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Ürünlere Dön
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Gallery */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center p-8 sm:p-12">
                            <div className="w-full h-full bg-white shadow-xl rounded-xl flex items-center justify-center">
                                <ShoppingBag className="w-16 sm:w-24 h-16 sm:h-24 text-gray-200" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square bg-gray-50 rounded-lg cursor-pointer hover:ring-2 ring-primary-500 transition-all flex items-center justify-center">
                                    <ShoppingBag className="w-4 sm:w-6 h-4 sm:h-6 text-gray-300" />
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Product Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6 sm:space-y-8"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {product.brand}
                                </span>
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="text-gray-600 text-sm font-medium">(4.8/5)</span>
                                </div>
                            </div>

                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
                                {product.name}
                            </h1>

                            <p className="text-xl sm:text-2xl font-bold text-primary-600 mb-6">
                                {product.price}
                            </p>

                            <p className="text-gray-600 leading-relaxed">
                                {product.description}
                            </p>
                        </div>

                        <div className="border-t border-b border-gray-100 py-6 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <ShieldCheck className="w-5 h-5 text-green-500" />
                                <span>%100 Orijinal Ürün Garantisi</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <Truck className="w-5 h-5 text-blue-500" />
                                <span>Aynı Gün Kargo</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-900 mb-4">Öne Çıkan Özellikler</h3>
                            <ul className="space-y-2">
                                {product.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3 text-gray-600 text-sm">
                                        <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <div className="flex items-center border border-gray-200 rounded-lg">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50"
                                >
                                    -
                                </button>
                                <span className="px-4 font-medium text-gray-900">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50"
                                >
                                    +
                                </button>
                            </div>
                            <button className="flex-1 btn-primary flex items-center justify-center gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                Sepete Ekle
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
