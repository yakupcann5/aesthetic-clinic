'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { getBlogPostBySlug } from '@/lib/data/blog';
import NotFound from '@/app/not-found';

export default function BlogPostPage() {
    const params = useParams();
    const post = getBlogPostBySlug(params.slug as string);

    if (!post) {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header Image */}
            <div className="relative h-[50vh] min-h-[400px] bg-gray-900">
                <div className="absolute inset-0 bg-gray-800 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <div className="max-w-4xl mx-auto text-white">
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Blog'a Dön
                        </Link>

                        <div className="flex items-center gap-4 text-sm text-primary-300 mb-4">
                            <span className="px-3 py-1 bg-primary-500/20 backdrop-blur-sm rounded-full border border-primary-500/30">
                                {post.category}
                            </span>
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {post.date}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {post.readTime}
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600">
                                <User className="w-5 h-5 text-gray-300" />
                            </div>
                            <div>
                                <p className="font-medium">{post.author}</p>
                                <p className="text-xs text-gray-400">Estetik Uzmanı</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section-container relative z-10 -mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Main Content */}
                    <motion.article
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-8 glass-card p-8 md:p-12"
                    >
                        <div className="prose prose-lg prose-purple max-w-none">
                            <p className="lead text-xl text-gray-600 mb-8 font-medium">
                                {post.excerpt}
                            </p>
                            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {post.content}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.article>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4 space-y-8">
                        {/* Share */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-primary-600" />
                                Paylaş
                            </h3>
                            <div className="flex gap-2">
                                <button className="p-3 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all">
                                    <Facebook className="w-5 h-5" />
                                </button>
                                <button className="p-3 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all">
                                    <Twitter className="w-5 h-5" />
                                </button>
                                <button className="p-3 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-all">
                                    <Linkedin className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Newsletter */}
                        <div className="glass-card p-6 bg-gradient-to-br from-primary-900 to-primary-800 text-white border-none">
                            <h3 className="text-xl font-display font-bold mb-2">Bültene Abone Olun</h3>
                            <p className="text-primary-100 text-sm mb-6">
                                En yeni estetik trendleri ve özel kampanyalardan haberdar olun.
                            </p>
                            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                                <input
                                    type="email"
                                    placeholder="E-posta adresiniz"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:bg-white/20 transition-all"
                                />
                                <button className="w-full btn-secondary bg-white text-primary-900 hover:bg-gray-100 border-none">
                                    Abone Ol
                                </button>
                            </form>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
