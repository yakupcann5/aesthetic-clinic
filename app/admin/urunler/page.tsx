'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import FormDialog from '@/components/admin/FormDialog';
import DeleteConfirm from '@/components/admin/DeleteConfirm';
import StatusBadge from '@/components/admin/StatusBadge';
import { products as initialProducts, productCategories } from '@/lib/data/products';
import type { Product } from '@/lib/types';

export default function AdminProductsPage() {
  const [items, setItems] = useState(initialProducts);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: Column<Product>[] = [
    {
      key: 'name',
      label: 'Ürün',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-400">{item.brand}</p>
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
    {
      key: 'features',
      label: 'Özellik',
      render: (item) => <span className="text-gray-600">{item.features.length} özellik</span>,
    },
  ];

  function handleEdit(item: Product) { setEditing(item); setFormOpen(true); }
  function handleDelete(item: Product) { setDeleting(item); setDeleteOpen(true); }
  function handleCreate() { setEditing(null); setFormOpen(true); }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      if (editing) {
        const res = await fetch(`/api/products/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) setItems((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...data } as Product : p)));
      } else {
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, features: [] }) });
        if (res.ok) { const result = await res.json(); setItems((prev) => [...prev, result.data]); }
      }
    } catch { /* API not connected */ }
    setLoading(false); setFormOpen(false); setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setLoading(true);
    try { await fetch(`/api/products/${deleting.id}`, { method: 'DELETE' }); } catch { /* */ }
    setItems((prev) => prev.filter((p) => p.id !== deleting.id));
    setLoading(false); setDeleteOpen(false); setDeleting(null);
  }

  const categories = productCategories.filter((c) => c.value !== 'all');

  return (
    <div className="space-y-6">
      <PageHeader title="Ürünler" description="Klinik ürünlerini yönetin" actionLabel="Yeni Ürün" onAction={handleCreate} />

      <DataTable<Product>
        data={items}
        columns={columns}
        searchKeys={['name', 'brand', 'category']}
        searchPlaceholder="Ürün ara..."
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormDialog open={formOpen} title={editing ? 'Ürün Düzenle' : 'Yeni Ürün'} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={handleFormSubmit} loading={loading}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
            <input name="name" defaultValue={editing?.name || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input name="slug" defaultValue={editing?.slug || ''} required pattern="^[a-z0-9-]+$" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
            <input name="brand" defaultValue={editing?.brand || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
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

      <DeleteConfirm open={deleteOpen} title="Ürünü Sil" message={`"${deleting?.name}" ürününü silmek istediğinizden emin misiniz?`} onConfirm={handleConfirmDelete} onCancel={() => { setDeleteOpen(false); setDeleting(null); }} loading={loading} />
    </div>
  );
}
