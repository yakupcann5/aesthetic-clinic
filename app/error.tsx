'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
          Bir hata oluştu
        </h2>
        <p className="text-gray-600 mb-6">
          Sayfa yüklenirken beklenmeyen bir hata meydana geldi.
        </p>
        <button
          onClick={reset}
          className="btn-primary"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
