'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import { Search, Mail, MailOpen, Trash2, X } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const mockMessages: ContactMessage[] = [
  { id: '1', name: 'Selin Aydın', email: 'selin@mail.com', phone: '0532 111 2233', subject: 'Botoks fiyat bilgisi', message: 'Merhaba, botoks uygulaması için fiyat bilgisi alabilir miyim? Alın bölgesi için düşünüyorum.', isRead: false, createdAt: '2026-02-10T08:30:00' },
  { id: '2', name: 'Burak Koç', email: 'burak@mail.com', phone: '0533 222 3344', subject: 'Randevu değişikliği', message: '12 Şubat tarihli randevumu 15 Şubat\'a almak istiyorum. Mümkün müdür?', isRead: false, createdAt: '2026-02-10T06:15:00' },
  { id: '3', name: 'Elif Aksoy', email: 'elif@mail.com', subject: 'Lazer epilasyon süreci', message: 'Lazer epilasyon seans sayısı ve aralıkları hakkında bilgi almak istiyorum.', isRead: true, createdAt: '2026-02-09T14:00:00' },
  { id: '4', name: 'Deniz Yıldırım', email: 'deniz@mail.com', phone: '0535 444 5566', subject: 'PRP tedavisi', message: 'Saç dökülmesi için PRP tedavisi uyguluyir musunuz? Fiyat ve seans bilgisi alabilir miyim?', isRead: true, createdAt: '2026-02-08T10:30:00' },
  { id: '5', name: 'Merve Şahin', email: 'merve@mail.com', subject: 'Cilt bakımı paketi', message: 'Cilt bakımı paketleriniz hakkında detaylı bilgi almak istiyorum. Kuru cilt tipi için öneriniz nedir?', isRead: true, createdAt: '2026-02-07T16:45:00' },
];

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState(mockMessages);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const filtered = messages.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'unread' && !m.isRead) || (filter === 'read' && m.isRead);
    return matchSearch && matchFilter;
  });

  const unreadCount = messages.filter((m) => !m.isRead).length;

  function markAsRead(id: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  }

  function deleteMessage(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function openMessage(msg: ContactMessage) {
    setSelected(msg);
    if (!msg.isRead) markAsRead(msg.id);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mesajlar" description={`${unreadCount} okunmamış mesaj`} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mesaj ara..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
        </div>
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f === 'all' ? 'Tümü' : f === 'unread' ? `Okunmamış (${unreadCount})` : 'Okunmuş'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {filtered.map((msg) => (
            <button key={msg.id} onClick={() => openMessage(msg)} className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${selected?.id === msg.id ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''} ${!msg.isRead ? 'bg-blue-50/50' : ''}`}>
              <div className="flex items-center gap-2">
                {msg.isRead ? <MailOpen className="w-4 h-4 text-gray-400 shrink-0" /> : <Mail className="w-4 h-4 text-primary-500 shrink-0" />}
                <span className={`text-sm truncate ${msg.isRead ? 'text-gray-600' : 'font-semibold text-gray-900'}`}>{msg.name}</span>
              </div>
              <p className={`text-sm mt-1 truncate ${msg.isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>{msg.subject}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(msg.createdAt)}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-400">Mesaj bulunamadı</div>
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          {selected ? (
            <div>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{selected.subject}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteMessage(selected.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Sil">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div><span className="text-gray-500">Gönderen:</span> <span className="font-medium">{selected.name}</span></div>
                  <div><span className="text-gray-500">E-posta:</span> <span>{selected.email}</span></div>
                  {selected.phone && <div><span className="text-gray-500">Telefon:</span> <span>{selected.phone}</span></div>}
                  <div><span className="text-gray-500">Tarih:</span> <span>{formatDate(selected.createdAt)}</span></div>
                </div>
                <StatusBadge label={selected.isRead ? 'Okundu' : 'Okunmadı'} variant={selected.isRead ? 'default' : 'warning'} />
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Görüntülemek için bir mesaj seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
