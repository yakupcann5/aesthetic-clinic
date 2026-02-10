'use client';

import PageHeader from '@/components/admin/PageHeader';
import { Globe, FileText, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface SeoPage {
  path: string;
  title: string;
  hasMetadata: boolean;
  hasJsonLd: boolean;
  hasOgImage: boolean;
  hasCanonical: boolean;
}

const seoPages: SeoPage[] = [
  { path: '/', title: 'Anasayfa', hasMetadata: true, hasJsonLd: true, hasOgImage: true, hasCanonical: true },
  { path: '/hizmetler', title: 'Hizmetler', hasMetadata: true, hasJsonLd: false, hasOgImage: false, hasCanonical: true },
  { path: '/hizmetler/[slug]', title: 'Hizmet Detay', hasMetadata: true, hasJsonLd: true, hasOgImage: true, hasCanonical: true },
  { path: '/urunler', title: 'Ürünler', hasMetadata: true, hasJsonLd: false, hasOgImage: false, hasCanonical: true },
  { path: '/urunler/[slug]', title: 'Ürün Detay', hasMetadata: true, hasJsonLd: true, hasOgImage: true, hasCanonical: true },
  { path: '/blog', title: 'Blog', hasMetadata: true, hasJsonLd: false, hasOgImage: false, hasCanonical: true },
  { path: '/blog/[slug]', title: 'Blog Detay', hasMetadata: true, hasJsonLd: true, hasOgImage: true, hasCanonical: true },
  { path: '/galeri', title: 'Galeri', hasMetadata: true, hasJsonLd: false, hasOgImage: false, hasCanonical: true },
  { path: '/randevu', title: 'Randevu', hasMetadata: true, hasJsonLd: false, hasOgImage: false, hasCanonical: true },
  { path: '/iletisim', title: 'İletişim', hasMetadata: true, hasJsonLd: false, hasOgImage: false, hasCanonical: true },
];

export default function AdminSeoPage() {
  const seoScore = Math.round(
    seoPages.reduce((acc, p) => acc + (p.hasMetadata ? 25 : 0) + (p.hasJsonLd ? 25 : 0) + (p.hasOgImage ? 25 : 0) + (p.hasCanonical ? 25 : 0), 0) / seoPages.length
  );

  return (
    <div className="space-y-6">
      <PageHeader title="SEO Yönetimi" description="Sayfa bazlı SEO durumunu kontrol edin" />

      {/* SEO Score */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${seoScore >= 70 ? 'bg-green-100 text-green-700' : seoScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {seoScore}
            </div>
            <div>
              <p className="text-sm text-gray-500">SEO Skoru</p>
              <p className="text-sm font-medium text-gray-900">/ 100</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary-500" />
            <div>
              <p className="text-lg font-bold text-gray-900">{seoPages.length}</p>
              <p className="text-sm text-gray-500">Toplam Sayfa</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-lg font-bold text-gray-900">{seoPages.filter((p) => p.hasJsonLd).length}</p>
              <p className="text-sm text-gray-500">JSON-LD</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <ExternalLink className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-gray-900">{seoPages.filter((p) => p.hasOgImage).length}</p>
              <p className="text-sm text-gray-500">OG Image</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="px-5 py-3">Sayfa</th>
              <th className="px-5 py-3">URL</th>
              <th className="px-5 py-3 text-center">Metadata</th>
              <th className="px-5 py-3 text-center">JSON-LD</th>
              <th className="px-5 py-3 text-center">OG Image</th>
              <th className="px-5 py-3 text-center">Canonical</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {seoPages.map((page) => (
              <tr key={page.path} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{page.title}</td>
                <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{page.path}</td>
                <td className="px-5 py-3.5 text-center">
                  {page.hasMetadata ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {page.hasJsonLd ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {page.hasOgImage ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {page.hasCanonical ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>Not:</strong> SEO ayarları şu anda kod seviyesinde yönetilmektedir. Veritabanı entegrasyonu sonrası her sayfa için özel meta başlık, açıklama ve OG görseli düzenlenebilecektir.
        </p>
      </div>
    </div>
  );
}
