import { galleryItems, galleryCategories } from '@/lib/data/gallery';
import GalleryGrid from '@/components/common/GalleryGrid';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Öncesi & Sonrası Galeri | Aesthetic Clinic',
  description: 'Hastalarımızın değişim hikayelerine tanık olun. Gerçek sonuçlar, gerçek mutluluklar.',
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="py-20 bg-primary-50">
        <div className="section-container text-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-6">
              Öncesi & Sonrası
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hastalarımızın değişim hikayelerine tanık olun. Gerçek sonuçlar, gerçek mutluluklar.
            </p>
          </div>
        </div>
      </section>

      <GalleryGrid categories={galleryCategories} items={galleryItems} />
    </div>
  );
}
