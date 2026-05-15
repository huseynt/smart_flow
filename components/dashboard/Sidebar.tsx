'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, ChevronDown, Building2, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UserRole } from '@/types';
import { Logo } from './Logo';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout, firebaseUser } = useAuth();
  const role = useRole();
  const { dbUser, profile } = useCurrentUser();

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Base menu items
  const menuItems = [{ name: '🏠 Ana Səhifə', href: '/home' }];

  // Role-specific menu items
  const roleMenuItems = [];
  if (role === UserRole.SUPPLY) {
    roleMenuItems.push({ name: '📦 Təchizat', href: '/supply/dashboard' });
    roleMenuItems.push({ name: '📊 Sifarişlər', href: '/supply/orders' });
  } else if (role === UserRole.DISTRIBUTION) {
    roleMenuItems.push({ name: '🚚 Paylamalar', href: '/distribution/dashboard' });
    roleMenuItems.push({ name: '📦 İnventar', href: '/distribution/inventory' });
  }

  const settingsItems = [
    { name: 'Profil', href: '/settings/profile' },
    { name: 'Dil', href: '/settings/language' },
  ];

  // Get user display name
  const displayName =
    profile &&
    'first_name' in profile &&
    'last_name' in profile
      ? `${profile.first_name} ${profile.last_name}`
      : firebaseUser?.displayName ||
        firebaseUser?.email?.split('@')[0] ||
        'İstifadəçi';

  const roleLabel =
    role === UserRole.SUPPLY
      ? 'Təchizatçı'
      : role === UserRole.DISTRIBUTION
        ? 'Distribyutor'
        : 'İstifadəçi';

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-indigo-500 text-white rounded-lg"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed md:relative md:block w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <Logo />
        </div>

        {/* User Profile Card */}
        {role && (
          <div className="p-4 bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-900 dark:to-blue-900 border-b border-gray-200 dark:border-gray-800 m-4 rounded-lg">
            <div className="flex items-start gap-2">
              <div
                className={`p-2 rounded-full ${
                  role === UserRole.SUPPLY
                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
                    : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                }`}
              >
                {role === UserRole.SUPPLY ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {roleLabel}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* Role-Specific Items */}
          {roleMenuItems.length > 0 && (
            <>
              <div className="my-2 px-4">
                <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>
              {roleMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </>
          )}

          {/* Settings Submenu */}
          <div className="my-2 px-4">
            <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-full text-left px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
            >
              <span>⚙️ Parametrlər</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isSettingsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSettingsOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {settingsItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                      isActive(item.href)
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    └ {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {firebaseUser?.email}
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Çıxış
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
