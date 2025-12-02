'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { blogPosts, blogCategories } from '@/lib/data/blog';
import { cn } from '@/lib/utils';
import { Calendar, Clock, ArrowRight, User } from 'lucide-react';

export default function BlogPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredPosts = selectedCategory === 'all'
        ? blogPosts
        : blogPosts.filter(post => post.category === selectedCategory);

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
                            Blog & Makaleler
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Güzellik, estetik ve sağlık dünyasından en güncel bilgiler, ipuçları ve uzman görüşleri.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Filter Section */}
            <section className="py-8 border-b border-gray-100 bg-white">
                <div className="section-container py-0">
                    <div className="flex flex-wrap justify-center gap-4">
                        {blogCategories.map((category) => (
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

            {/* Blog Grid */}
            <section className="section-container">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPosts.map((post, index) => (
                        <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="group flex flex-col h-full"
                        >
                            <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                                <div className="glass-card overflow-hidden h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                                    {/* Image */}
                                    <div className="relative h-56 overflow-hidden bg-gray-200">
                                        <div className="absolute inset-0 bg-gray-300 animate-pulse" />
                                        <div className="absolute top-4 left-4 z-10">
                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-primary-600 uppercase tracking-wider">
                                                {blogCategories.find(c => c.value === post.category)?.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {post.date}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {post.readTime}
                                            </div>
                                        </div>

                                        <h2 className="text-xl font-display font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                                            {post.title}
                                        </h2>

                                        <p className="text-gray-600 text-sm mb-6 line-clamp-3 flex-grow">
                                            {post.excerpt}
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-gray-500" />
                                                </div>
                                                {post.author}
                                            </div>
                                            <span className="flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:translate-x-1 transition-transform">
                                                Devamını Oku
                                                <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.article>
                    ))}
                </div>
            </section>
        </div>
    );
}
