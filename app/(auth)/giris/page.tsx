import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Giriş Yap',
  description: 'Aesthetic Clinic yönetim paneline giriş yapın.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
