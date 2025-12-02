'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="text-center max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-9xl font-display font-bold text-primary-200 mb-4">
                        404
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
                        Sayfa Bulunamadı
                    </h2>
                    <p className="text-lg text-gray-600 mb-8">
                        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
                        Ana sayfaya dönerek diğer hizmetlerimize göz atabilirsiniz.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/"
                            className="btn-primary flex items-center gap-2"
                        >
                            <Home className="w-5 h-5" />
                            Ana Sayfaya Dön
                        </Link>
                        <button
                            onClick={() => window.history.back()}
                            className="btn-outline flex items-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Geri Dön
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
