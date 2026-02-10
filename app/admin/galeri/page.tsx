'use client';

import { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import FormDialog from '@/components/admin/FormDialog';
import DeleteConfirm from '@/components/admin/DeleteConfirm';
import StatusBadge from '@/components/admin/StatusBadge';
import { galleryItems as initialItems, galleryCategories } from '@/lib/data/gallery';
import type { GalleryItem } from '@/lib/types';

export default function AdminGalleryPage() {
  const [items, setItems] = useState(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? items : items.filter((item) => item.category === filter);

  function handleCreate() { setEditing(null); setFormOpen(true); }
  function handleEdit(item: GalleryItem) { setEditing(item); setFormOpen(true); }
  function handleDelete(item: GalleryItem) { setDeleting(item); setDeleteOpen(true); }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      if (editing) {
        await fetch(`/api/gallery/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setItems((prev) => prev.map((g) => (g.id === editing.id ? { ...g, ...data } as unknown as GalleryItem : g)));
      } else {
        const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) { const result = await res.json(); setItems((prev) => [...prev, result.data]); }
      }
    } catch { /* */ }
    setLoading(false); setFormOpen(false); setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setLoading(true);
    try { await fetch(`/api/gallery/${deleting.id}`, { method: 'DELETE' }); } catch { /* */ }
    setItems((prev) => prev.filter((g) => g.id !== deleting.id));
    setLoading(false); setDeleteOpen(false); setDeleting(null);
  }

  const categories = galleryCategories.filter((c) => c.value !== 'all');

  return (
    <div className="space-y-6">
      <PageHeader title="Galeri" description="Öncesi/sonrası görselleri yönetin" actionLabel="Yeni Görsel" onAction={handleCreate} />

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {galleryCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === cat.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
            <div className="grid grid-cols-2 gap-0.5 bg-gray-100">
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                <div className="text-center p-2">
                  <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase">Önce</span>
                </div>
              </div>
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                <div className="text-center p-2">
                  <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase">Sonra</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge label={item.category} variant="info" />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900">{item.service}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">Bu kategoride görsel bulunamadı</div>
      )}

      <FormDialog open={formOpen} title={editing ? 'Görseli Düzenle' : 'Yeni Galeri Görseli'} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={handleFormSubmit} loading={loading}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select name="category" defaultValue={editing?.category || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none">
              <option value="">Seçin</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet</label>
            <input name="service" defaultValue={editing?.service || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Önce Görsel URL</label>
            <input name="beforeImage" defaultValue={editing?.beforeImage || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sonra Görsel URL</label>
            <input name="afterImage" defaultValue={editing?.afterImage || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea name="description" defaultValue={editing?.description || ''} required rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
          </div>
        </div>
      </FormDialog>

      <DeleteConfirm open={deleteOpen} title="Görseli Sil" message="Bu galeri görselini silmek istediğinizden emin misiniz?" onConfirm={handleConfirmDelete} onCancel={() => { setDeleteOpen(false); setDeleting(null); }} loading={loading} />
    </div>
  );
}
