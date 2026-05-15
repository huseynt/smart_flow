/**
 * Supply Dashboard Page
 * Supply-specific dashboard page
 */

'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRole } from '@/hooks/useRole';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SupplyDashboardPage() {
  const router = useRouter();
  const role = useRole();

  // Protect and ensure user is supply
  useEffect(() => {
    if (role && role !== UserRole.SUPPLY) {
      router.push('/unauthorized');
    }
  }, [role, router]);

  useRequireAuth({ requiredRole: UserRole.SUPPLY });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📦 Təchizat Paneli
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Sifarişlərinizi idarə edin
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-800 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Qruquzastırılıyor
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Təchizat paneli tezliklə aktiv olacaq
        </p>
      </div>
    </div>
  );
}
