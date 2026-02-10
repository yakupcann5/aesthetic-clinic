'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalVisits: number;
  lastVisit: string;
  services: string[];
}

const mockPatients: Patient[] = [
  { id: '1', name: 'Ayşe Yılmaz', email: 'ayse@mail.com', phone: '0532 111 2233', totalVisits: 8, lastVisit: '2026-02-10', services: ['Botoks', 'Cilt Bakımı'] },
  { id: '2', name: 'Mehmet Kaya', email: 'mehmet@mail.com', phone: '0533 222 3344', totalVisits: 3, lastVisit: '2026-02-08', services: ['Lazer Epilasyon'] },
  { id: '3', name: 'Fatma Demir', email: 'fatma@mail.com', phone: '0534 333 4455', totalVisits: 12, lastVisit: '2026-02-10', services: ['Dudak Dolgusu', 'Botoks'] },
  { id: '4', name: 'Ali Öztürk', email: 'ali@mail.com', phone: '0535 444 5566', totalVisits: 2, lastVisit: '2026-02-05', services: ['PRP Tedavisi'] },
  { id: '5', name: 'Zeynep Çelik', email: 'zeynep@mail.com', phone: '0536 555 6677', totalVisits: 6, lastVisit: '2026-02-11', services: ['Cilt Bakımı', 'Peeling'] },
  { id: '6', name: 'Can Yıldız', email: 'can@mail.com', phone: '0537 666 7788', totalVisits: 1, lastVisit: '2026-01-20', services: ['Botoks'] },
  { id: '7', name: 'Elif Aksoy', email: 'elif@mail.com', phone: '0538 777 8899', totalVisits: 5, lastVisit: '2026-02-09', services: ['Lazer Epilasyon', 'Cilt Bakımı'] },
  { id: '8', name: 'Burak Koç', email: 'burak@mail.com', phone: '0539 888 9900', totalVisits: 4, lastVisit: '2026-02-07', services: ['Dudak Dolgusu'] },
];

export default function AdminPatientsPage() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const columns: Column<Patient>[] = [
    {
      key: 'name',
      label: 'Hasta',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-400">{item.email}</p>
        </div>
      ),
    },
    { key: 'phone', label: 'Telefon' },
    {
      key: 'totalVisits',
      label: 'Ziyaret',
      sortable: true,
      render: (item) => <span className="font-medium text-gray-900">{item.totalVisits}</span>,
    },
    {
      key: 'services',
      label: 'Hizmetler',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.services.map((s) => <StatusBadge key={s} label={s} variant="info" />)}
        </div>
      ),
    },
    {
      key: 'lastVisit',
      label: 'Son Ziyaret',
      sortable: true,
      render: (item) => <span className="text-gray-600">{item.lastVisit}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Hastalar" description={`${mockPatients.length} kayıtlı hasta`} />

      <DataTable<Patient>
        data={mockPatients}
        columns={columns}
        searchKeys={['name', 'email', 'phone']}
        searchPlaceholder="Hasta ara..."
        onEdit={setSelectedPatient}
      />

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedPatient(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-display font-bold text-gray-900 mb-4">Hasta Detayı</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Ad Soyad:</span><span className="font-medium">{selectedPatient.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">E-posta:</span><span>{selectedPatient.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Telefon:</span><span>{selectedPatient.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Toplam Ziyaret:</span><span className="font-medium">{selectedPatient.totalVisits}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Son Ziyaret:</span><span>{selectedPatient.lastVisit}</span></div>
              <div>
                <span className="text-gray-500">Aldığı Hizmetler:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPatient.services.map((s) => <StatusBadge key={s} label={s} variant="info" />)}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedPatient(null)} className="w-full mt-6 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
