import Link from 'next/link';
import { products, productCategories } from '@/lib/data/products';
import CategoryFilter from '@/components/common/CategoryFilter';
import { ShoppingBag, Star, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import type { Product } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Dermo-Kozmetik Ürünler',
  description: 'Uzmanlarımızın önerdiği, klinik onaylı profesyonel bakım ürünleri ile güzelliğinizi evde de koruyun.',
  alternates: { canonical: '/urunler' },
};

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/urunler/${product.slug}`} className="block h-full group">
      <div className="glass-card h-full overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100 p-4 sm:p-8 flex items-center justify-center">
          <div className="w-3/4 h-3/4 bg-white shadow-lg rounded-xl flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-12 h-12 opacity-20" />
          </div>
          <div className="absolute top-4 left-4">
            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-bold text-gray-600 uppercase tracking-wider border border-gray-200">
              {product.brand}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-xs text-gray-400 ml-1">(4.8)</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-grow">
            {product.description}
          </p>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <span className="text-lg font-bold text-primary-600">
              {product.price}
            </span>
            <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-primary-50">
        <div className="section-container text-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
              Dermo-Kozmetik Ürünler
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Uzmanlarımızın önerdiği, klinik onaylı profesyonel bakım ürünleri ile güzelliğinizi evde de koruyun.
            </p>
          </div>
        </div>
      </section>

      <CategoryFilter
        categories={productCategories}
        items={products}
        filterKey="category"
        renderItems={(filteredProducts) => (
          <section className="section-container">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      />
    </div>
  );
}
