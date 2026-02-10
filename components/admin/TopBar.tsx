'use client';

import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { Bell, Menu, User, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function TopBar() {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      {/* Mobile menu button */}
      <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Title area */}
      <div className="hidden lg:block">
        <h2 className="text-sm font-medium text-gray-500">Aesthetic Clinic</h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {session?.user?.name || 'Admin'}
            </span>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/giris' })}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
