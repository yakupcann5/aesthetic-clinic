'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kayıt sırasında bir hata oluştu');
      } else {
        router.push('/giris?registered=true');
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-6 sm:p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-2">
          Kayıt Ol
        </h1>
        <p className="text-gray-600">
          Yeni bir hesap oluşturun
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Ad Soyad
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Ad Soyad"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="ornek@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
            Şifre Tekrar
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Zaten hesabınız var mı?{' '}
        <Link href="/giris" className="text-primary-600 hover:text-primary-700 font-medium">
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}
