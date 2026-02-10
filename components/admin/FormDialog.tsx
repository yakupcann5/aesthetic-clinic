'use client';

import { X } from 'lucide-react';

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  loading?: boolean;
  submitLabel?: string;
}

export default function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  children,
  loading = false,
  submitLabel = 'Kaydet',
}: FormDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-display font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
