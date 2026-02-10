import { Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PageHeader({ title, description, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
