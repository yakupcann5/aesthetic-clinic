import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-display font-bold text-primary-200 mb-4">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
          Sayfa Bulunamadı
        </h2>
        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          Ana sayfaya dönerek diğer hizmetlerimize göz atabilirsiniz.
        </p>

        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Home className="w-5 h-5" />
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
