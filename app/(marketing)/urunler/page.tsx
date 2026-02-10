import { products, productCategories } from '@/lib/data/products';
import ProductsList from '@/components/products/ProductsList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dermo-Kozmetik Ürünler',
  description: 'Uzmanlarımızın önerdiği, klinik onaylı profesyonel bakım ürünleri ile güzelliğinizi evde de koruyun.',
  alternates: { canonical: '/urunler' },
};

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

      <ProductsList products={products} categories={productCategories} />
    </div>
  );
}
