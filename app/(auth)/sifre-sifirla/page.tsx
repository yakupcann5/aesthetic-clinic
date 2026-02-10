import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Şifre Sıfırla',
  description: 'Aesthetic Clinic hesap şifrenizi sıfırlayın.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="glass-card p-6 sm:p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-2">
          Şifre Sıfırla
        </h1>
        <p className="text-gray-600">
          E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz
        </p>
      </div>

      <form className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            placeholder="ornek@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>

        <button type="submit" className="w-full btn-primary py-3">
          Sıfırlama Bağlantısı Gönder
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Şifrenizi hatırladınız mı?{' '}
        <Link href="/giris" className="text-primary-600 hover:text-primary-700 font-medium">
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}
