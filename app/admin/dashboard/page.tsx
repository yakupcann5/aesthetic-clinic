import { Calendar, Users, Scissors, MessageSquare, TrendingUp, Clock, Package, FileText, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { services } from '@/lib/data/services';
import { products } from '@/lib/data/products';
import { blogPosts } from '@/lib/data/blog';
import { galleryItems } from '@/lib/data/gallery';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const recentAppointments = [
  { name: 'Ayşe Yılmaz', service: 'Botoks', date: '10 Şubat 2026', time: '10:00', status: 'Onaylandı' },
  { name: 'Mehmet Kaya', service: 'Lazer Epilasyon', date: '10 Şubat 2026', time: '11:30', status: 'Bekliyor' },
  { name: 'Fatma Demir', service: 'Dudak Dolgusu', date: '10 Şubat 2026', time: '14:00', status: 'Onaylandı' },
  { name: 'Ali Öztürk', service: 'PRP Tedavisi', date: '11 Şubat 2026', time: '09:30', status: 'Bekliyor' },
  { name: 'Zeynep Çelik', service: 'Cilt Bakımı', date: '11 Şubat 2026', time: '13:00', status: 'Onaylandı' },
];

const recentMessages = [
  { name: 'Selin Aydın', subject: 'Botoks fiyat bilgisi', time: '2 saat önce', read: false },
  { name: 'Burak Koç', subject: 'Randevu değişikliği', time: '4 saat önce', read: false },
  { name: 'Elif Aksoy', subject: 'Lazer epilasyon süreci', time: '1 gün önce', read: true },
];

export default function DashboardPage() {
  const stats = [
    { label: 'Toplam Randevu', value: '1,248', change: '+12%', icon: Calendar, color: 'bg-primary-100 text-primary-600', href: '/admin/randevular' },
    { label: 'Aktif Hasta', value: '856', change: '+8%', icon: Users, color: 'bg-teal-100 text-teal-600', href: '/admin/hastalar' },
    { label: 'Hizmet Sayısı', value: String(services.length), change: '', icon: Scissors, color: 'bg-orange-100 text-orange-600', href: '/admin/hizmetler' },
    { label: 'Yeni Mesaj', value: '18', change: '+5', icon: MessageSquare, color: 'bg-blue-100 text-blue-600', href: '/admin/mesajlar' },
  ];

  const quickStats = [
    { label: 'Ürünler', value: products.length, icon: Package, href: '/admin/urunler' },
    { label: 'Blog Yazısı', value: blogPosts.length, icon: FileText, href: '/admin/blog' },
    { label: 'Galeri', value: galleryItems.length, icon: Calendar, href: '/admin/galeri' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Kliniğinizin genel durumuna göz atın</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change && (
                <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-primary-200 transition-all">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-gray-900">Son Randevular</h2>
            <Link href="/admin/randevular" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Tümünü Gör
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Hasta</th>
                  <th className="px-5 py-3">Hizmet</th>
                  <th className="px-5 py-3">Tarih</th>
                  <th className="px-5 py-3">Saat</th>
                  <th className="px-5 py-3">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentAppointments.map((appointment, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{appointment.name}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{appointment.service}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{appointment.date}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {appointment.time}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        appointment.status === 'Onaylandı' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-gray-900">Son Mesajlar</h2>
            <Link href="/admin/mesajlar" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Tümü
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentMessages.map((msg, i) => (
              <div key={i} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${msg.read ? 'text-gray-600' : 'text-gray-900'}`}>
                    {msg.name}
                  </span>
                  {!msg.read && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{msg.subject}</p>
                <p className="text-xs text-gray-400 mt-1">{msg.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
