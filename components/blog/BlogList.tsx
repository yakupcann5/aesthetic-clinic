'use client';

import Link from 'next/link';
import { Calendar, Clock, ArrowRight, User } from 'lucide-react';
import CategoryFilter from '@/components/common/CategoryFilter';
import type { BlogPost } from '@/lib/types';

interface BlogListProps {
  posts: BlogPost[];
  categories: { value: string; label: string }[];
}

function BlogCard({ post, categories }: { post: BlogPost; categories: { value: string; label: string }[] }) {
  return (
    <article className="group flex flex-col h-full">
      <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
        <div className="glass-card overflow-hidden h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
          {/* Image */}
          <div className="relative h-44 sm:h-56 overflow-hidden bg-gray-200">
            <div className="absolute inset-0 bg-gray-300" />
            <div className="absolute top-4 left-4 z-10">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-primary-600 uppercase tracking-wider">
                {categories.find(c => c.value === post.category)?.label}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 flex flex-col flex-grow">
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
    </article>
  );
}

export default function BlogList({ posts, categories }: BlogListProps) {
  return (
    <CategoryFilter
      categories={categories}
      items={posts}
      filterKey="category"
      renderItems={(filteredPosts) => (
        <section className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPosts.map((post) => (
              <BlogCard key={post.id} post={post} categories={categories} />
            ))}
          </div>
        </section>
      )}
    />
  );
}
