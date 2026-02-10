import { blogPosts, blogCategories } from '@/lib/data/blog';
import BlogList from '@/components/blog/BlogList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog & Makaleler',
  description: 'Güzellik, estetik ve sağlık dünyasından en güncel bilgiler, ipuçları ve uzman görüşleri.',
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-primary-50">
        <div className="section-container text-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
              Blog & Makaleler
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Güzellik, estetik ve sağlık dünyasından en güncel bilgiler, ipuçları ve uzman görüşleri.
            </p>
          </div>
        </div>
      </section>

      <BlogList posts={blogPosts} categories={blogCategories} />
    </div>
  );
}
