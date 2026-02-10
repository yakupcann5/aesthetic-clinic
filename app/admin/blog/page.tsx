'use client';

import { useState } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import FormDialog from '@/components/admin/FormDialog';
import DeleteConfirm from '@/components/admin/DeleteConfirm';
import StatusBadge from '@/components/admin/StatusBadge';
import { blogPosts as initialPosts, blogCategories } from '@/lib/data/blog';
import type { BlogPost } from '@/lib/types';

export default function AdminBlogPage() {
  const [items, setItems] = useState(initialPosts);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      label: 'Başlık',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          <p className="text-xs text-gray-400">/{item.slug}</p>
        </div>
      ),
    },
    { key: 'author', label: 'Yazar', sortable: true },
    {
      key: 'category',
      label: 'Kategori',
      sortable: true,
      render: (item) => <StatusBadge label={item.category} variant="info" />,
    },
    { key: 'readTime', label: 'Okuma' },
    {
      key: 'date',
      label: 'Tarih',
      sortable: true,
      render: (item) => <span className="text-gray-600">{item.date}</span>,
    },
    {
      key: 'tags',
      label: 'Durum',
      render: () => <StatusBadge label="Yayında" variant="success" />,
    },
  ];

  function handleEdit(item: BlogPost) { setEditing(item); setFormOpen(true); }
  function handleDelete(item: BlogPost) { setDeleting(item); setDeleteOpen(true); }
  function handleCreate() { setEditing(null); setFormOpen(true); }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const tagsStr = formData.get('tags') as string;
    const payload = { ...data, tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()) : [], isPublished: formData.get('isPublished') === 'on' };

    try {
      if (editing) {
        const res = await fetch(`/api/blog/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) setItems((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...payload } as unknown as BlogPost : p)));
      } else {
        const res = await fetch('/api/blog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { const result = await res.json(); setItems((prev) => [...prev, result.data]); }
      }
    } catch { /* API not connected */ }
    setLoading(false); setFormOpen(false); setEditing(null);
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setLoading(true);
    try { await fetch(`/api/blog/${deleting.id}`, { method: 'DELETE' }); } catch { /* */ }
    setItems((prev) => prev.filter((p) => p.id !== deleting.id));
    setLoading(false); setDeleteOpen(false); setDeleting(null);
  }

  const categories = blogCategories.filter((c) => c.value !== 'all');

  return (
    <div className="space-y-6">
      <PageHeader title="Blog" description="Blog yazılarını yönetin" actionLabel="Yeni Yazı" onAction={handleCreate} />

      <DataTable<BlogPost>
        data={items}
        columns={columns}
        searchKeys={['title', 'author', 'category']}
        searchPlaceholder="Blog yazısı ara..."
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormDialog open={formOpen} title={editing ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={handleFormSubmit} loading={loading}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Yazar</label>
            <input name="author" defaultValue={editing?.author || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select name="category" defaultValue={editing?.category || ''} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none">
              <option value="">Seçin</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Okuma Süresi</label>
            <input name="readTime" defaultValue={editing?.readTime || ''} required placeholder="5 dakika" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Özet</label>
            <textarea name="excerpt" defaultValue={editing?.excerpt || ''} required rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
            <textarea name="content" defaultValue={editing?.content || ''} required rows={8} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etiketler (virgülle ayırın)</label>
            <input name="tags" defaultValue={editing?.tags?.join(', ') || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" name="isPublished" id="isPublished" defaultChecked className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="isPublished" className="text-sm text-gray-700">Yayınla</label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
            <input name="image" defaultValue={editing?.image || ''} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none" />
          </div>
        </div>
      </FormDialog>

      <DeleteConfirm open={deleteOpen} title="Blog Yazısını Sil" message={`"${deleting?.title}" yazısını silmek istediğinizden emin misiniz?`} onConfirm={handleConfirmDelete} onCancel={() => { setDeleteOpen(false); setDeleting(null); }} loading={loading} />
    </div>
  );
}
