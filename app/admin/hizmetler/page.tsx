'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import FormDialog from '@/components/admin/FormDialog';
import DeleteConfirm from '@/components/admin/DeleteConfirm';
import StatusBadge from '@/components/admin/StatusBadge';
import { services as initialServices, serviceCategories } from '@/lib/data/services';
import type { Service } from '@/lib/types';

export default function AdminServicesPage() {
  const [items, setItems] = useState(initialServices);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: Column<Service>[] = [
    {
      key: 'title',
      label: 'Hizmet',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          <p className="text-xs text-gray-400">/{item.slug}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      sortable: true,
      render: (item) => <StatusBadge label={item.category} variant="info" />,
    },
    { key: 'price', label: 'Fiyat', sortable: true },
    { key: 'duration', label: 'Süre' },
    {
      key: 'isActive',
      label: 'Durum',
      render: () => <StatusBadge label="Aktif" variant="success" />,
    },
  ];

  function handleEdit(item: Service) {
    setEditing(item);
    setFormOpen(true);
  }

  function handleDelete(item: Service) {
    setDeleting(item);
    setDeleteOpen(true);
  }

  function handleCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (editing) {
        const res = await fetch(`/api/services/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setItems((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...data } as Service : s)));
        }
      } else {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, benefits: [], process: [] }),
        });
        if (res.ok) {
          const result = await res.json();
          setItems((prev) => [...prev, result.data]);
        }
      }
    } catch {
      // API might not be connected to DB yet
    }
    setLoading(false);
    setFormOpen(false);
    setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setLoading(true);
    try {
      await fetch(`/api/services/${deleting.id}`, { method: 'DELETE' });
    } catch {
      // API might not be connected to DB yet
    }
    setItems((prev) => prev.filter((s) => s.id !== deleting.id));
    setLoading(false);
    setDeleteOpen(false);
    setDeleting(null);
  }

  const categories = serviceCategories.filter((c) => c.value !== 'all');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hizmetler"
        description="Klinik hizmetlerini yönetin"
        actionLabel="Yeni Hizmet"
        onAction={handleCreate}
      />

      <DataTable<Service>
        data={items}
        columns={columns}
        searchKeys={['title', 'category']}
        searchPlaceholder="Hizmet ara..."
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormDialog
        open={formOpen}
        title={editing ? 'Hizmet Düzenle' : 'Yeni Hizmet'}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleFormSubmit}
        loading={loading}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
            <input name="title" defaultValue={editing?.title || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input name="slug" defaultValue={editing?.slug || ''} required pattern="^[a-z0-9-]+$" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select name="category" defaultValue={editing?.category || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none">
              <option value="">Seçin</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat</label>
            <input name="price" defaultValue={editing?.price || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Süre</label>
            <input name="duration" defaultValue={editing?.duration || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kısa Açıklama</label>
            <input name="shortDescription" defaultValue={editing?.shortDescription || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea name="description" defaultValue={editing?.description || ''} required rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
            <input name="image" defaultValue={editing?.image || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
        </div>
      </FormDialog>

      <DeleteConfirm
        open={deleteOpen}
        title="Hizmeti Sil"
        message={`"${deleting?.title}" hizmetini silmek istediğinizden emin misiniz?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleting(null); }}
        loading={loading}
      />
    </div>
  );
}
