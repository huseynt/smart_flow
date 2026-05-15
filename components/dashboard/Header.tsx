'use client';

import { useState } from 'react';
import { ChevronDown, LogOut, Building2, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from './Logo';
import Link from 'next/link';

export function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { firebaseUser, logout } = useAuth();
  const role = useRole();
  const { profile } = useCurrentUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get user display name
  const displayName =
    profile && 'first_name' in profile && 'last_name' in profile
      ? `${profile.first_name} ${profile.last_name}`
      : firebaseUser?.displayName ||
        firebaseUser?.email?.split('@')[0] ||
        'User';

  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    role === UserRole.SUPPLY
      ? 'Təchizatçı'
      : role === UserRole.DISTRIBUTION
        ? 'Distribyutor'
        : 'İstifadəçi';

  const roleBgColor =
    role === UserRole.SUPPLY
      ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shadow-sm">
      {/* Left: Empty for balance */}
      <div></div>

      {/* Right: Theme Toggle + Role Badge + User Menu */}
      <div className="flex items-center gap-4 ml-auto">

        {/* Role Badge */}
        {role && (
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${roleBgColor}`}
          >
            {role === UserRole.SUPPLY ? (
              <Building2 className="h-3 w-3" />
            ) : (
              <Truck className="h-3 w-3" />
            )}
            {roleLabel}
          </div>
        )}

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="h-8 w-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {userInitials}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {firebaseUser?.email}
                </p>
                {role && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                    {roleLabel}
                  </p>
                )}
              </div>

              <div className="p-2 space-y-1">
                <Link
                  href="/settings/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Profil Parametrləri
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                >
                  <LogOut className="h-4 w-4" />
                  Çıxış
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
}
