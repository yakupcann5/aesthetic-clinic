import { Calendar, Users, Scissors, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const stats = [
  { label: 'Toplam Randevu', value: '1,248', change: '+12%', icon: Calendar, color: 'bg-primary-100 text-primary-600' },
  { label: 'Aktif Hasta', value: '856', change: '+8%', icon: Users, color: 'bg-teal-100 text-teal-600' },
  { label: 'Hizmet Sayısı', value: '24', change: '+2', icon: Scissors, color: 'bg-orange-100 text-orange-600' },
  { label: 'Yeni Mesaj', value: '18', change: '+5', icon: MessageSquare, color: 'bg-blue-100 text-blue-600' },
];

const recentAppointments = [
  { name: 'Ayşe Yılmaz', service: 'Botoks', date: '10 Şubat 2026', time: '10:00', status: 'Onaylandı' },
  { name: 'Mehmet Kaya', service: 'Lazer Epilasyon', date: '10 Şubat 2026', time: '11:30', status: 'Bekliyor' },
  { name: 'Fatma Demir', service: 'Dudak Dolgusu', date: '10 Şubat 2026', time: '14:00', status: 'Onaylandı' },
  { name: 'Ali Öztürk', service: 'PRP Tedavisi', date: '11 Şubat 2026', time: '09:30', status: 'Bekliyor' },
  { name: 'Zeynep Çelik', service: 'Cilt Bakımı', date: '11 Şubat 2026', time: '13:00', status: 'Onaylandı' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Kliniğinizin genel durumuna göz atın</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent appointments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-gray-900">Son Randevular</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Tümünü Gör
          </button>
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
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-gray-900">{appointment.name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{appointment.service}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{appointment.date}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {appointment.time}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      appointment.status === 'Onaylandı'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
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
    </div>
  );
}
