'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import { Search, Eye } from 'lucide-react';

interface Appointment {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: 'Bekliyor' | 'Onaylandı' | 'İptal' | 'Tamamlandı';
  message?: string;
}

const mockAppointments: Appointment[] = [
  { id: '1', name: 'Ayşe Yılmaz', email: 'ayse@mail.com', phone: '0532 111 2233', service: 'Botoks', date: '2026-02-10', time: '10:00', status: 'Onaylandı' },
  { id: '2', name: 'Mehmet Kaya', email: 'mehmet@mail.com', phone: '0533 222 3344', service: 'Lazer Epilasyon', date: '2026-02-10', time: '11:30', status: 'Bekliyor' },
  { id: '3', name: 'Fatma Demir', email: 'fatma@mail.com', phone: '0534 333 4455', service: 'Dudak Dolgusu', date: '2026-02-10', time: '14:00', status: 'Onaylandı' },
  { id: '4', name: 'Ali Öztürk', email: 'ali@mail.com', phone: '0535 444 5566', service: 'PRP Tedavisi', date: '2026-02-11', time: '09:30', status: 'Bekliyor' },
  { id: '5', name: 'Zeynep Çelik', email: 'zeynep@mail.com', phone: '0536 555 6677', service: 'Cilt Bakımı', date: '2026-02-11', time: '13:00', status: 'Tamamlandı' },
  { id: '6', name: 'Can Yıldız', email: 'can@mail.com', phone: '0537 666 7788', service: 'Botoks', date: '2026-02-12', time: '10:30', status: 'İptal' },
  { id: '7', name: 'Elif Aksoy', email: 'elif@mail.com', phone: '0538 777 8899', service: 'Lazer Epilasyon', date: '2026-02-12', time: '15:00', status: 'Bekliyor' },
  { id: '8', name: 'Burak Koç', email: 'burak@mail.com', phone: '0539 888 9900', service: 'Dudak Dolgusu', date: '2026-02-13', time: '11:00', status: 'Onaylandı' },
];

const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  'Bekliyor': { variant: 'warning', label: 'Bekliyor' },
  'Onaylandı': { variant: 'success', label: 'Onaylandı' },
  'İptal': { variant: 'error', label: 'İptal' },
  'Tamamlandı': { variant: 'info', label: 'Tamamlandı' },
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState(mockAppointments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = appointments.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.service.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const detail = detailId ? appointments.find((a) => a.id === detailId) : null;

  function updateStatus(id: string, status: Appointment['status']) {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    // TODO: Call API when DB connected
    // fetch(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Randevular" description="Klinik randevularını yönetin" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hasta veya hizmet ara..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Bekliyor', 'Onaylandı', 'Tamamlandı', 'İptal'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'Tümü' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="px-5 py-3">Hasta</th>
              <th className="px-5 py-3">Hizmet</th>
              <th className="px-5 py-3">Tarih</th>
              <th className="px-5 py-3">Saat</th>
              <th className="px-5 py-3">Durum</th>
              <th className="px-5 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.email}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{a.service}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{a.date}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{a.time}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge label={statusMap[a.status].label} variant={statusMap[a.status].variant} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setDetailId(a.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50" title="Detay">
                      <Eye className="w-4 h-4" />
                    </button>
                    {a.status === 'Bekliyor' && (
                      <>
                        <button onClick={() => updateStatus(a.id, 'Onaylandı')} className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100">
                          Onayla
                        </button>
                        <button onClick={() => updateStatus(a.id, 'İptal')} className="px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100">
                          İptal
                        </button>
                      </>
                    )}
                    {a.status === 'Onaylandı' && (
                      <button onClick={() => updateStatus(a.id, 'Tamamlandı')} className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                        Tamamla
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Randevu bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDetailId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-display font-bold text-gray-900 mb-4">Randevu Detayı</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Hasta:</span><span className="font-medium">{detail.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">E-posta:</span><span>{detail.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Telefon:</span><span>{detail.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Hizmet:</span><span>{detail.service}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tarih:</span><span>{detail.date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Saat:</span><span>{detail.time}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Durum:</span><StatusBadge label={statusMap[detail.status].label} variant={statusMap[detail.status].variant} /></div>
            </div>
            <button onClick={() => setDetailId(null)} className="w-full mt-6 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
