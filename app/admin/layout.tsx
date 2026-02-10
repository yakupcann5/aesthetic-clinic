import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import SessionProvider from '@/components/auth/SessionProvider';
import Sidebar from '@/components/admin/Sidebar';
import TopBar from '@/components/admin/TopBar';

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | Admin - Aesthetic Clinic',
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/giris');
  }

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
