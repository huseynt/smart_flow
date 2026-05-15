/**
 * Supply Orders Page
 */

'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';

export default function SupplyOrdersPage() {
  useRequireAuth({ requiredRole: UserRole.SUPPLY });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        📊 Sifarişlər
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Sifarişləri idarə edin
      </p>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-800 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Qruquzastırılıyor
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sifarişlər səhifəsi tezliklə aktiv olacaq
        </p>
      </div>
    </div>
  );
}
