'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';
import { useDistributionProfile } from '@/hooks/useDistributionProfile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import { Building2, Truck, TrendingUp, Package } from 'lucide-react';

export default function HomePage() {
  // Protect the page
  useRequireAuth();

  const { loading, firebaseUser } = useAuth();
  const role = useRole();
  const supplyProfile = useSupplyProfile();
  const distributionProfile = useDistributionProfile();

  // Get user display name
  const displayName =
    supplyProfile && 'first_name' in supplyProfile && 'last_name' in supplyProfile
      ? `${supplyProfile.first_name} ${supplyProfile.last_name}`
      : distributionProfile && 'first_name' in distributionProfile && 'last_name' in distributionProfile
        ? `${distributionProfile.first_name} ${distributionProfile.last_name}`
        : firebaseUser?.displayName ||
          firebaseUser?.email?.split('@')[0] ||
          'İstifadəçi';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Xoş gəldiniz, {displayName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {role === UserRole.SUPPLY
            ? 'Təchizat panelində təxilasdan qayıdış etdikcə şad oluruq'
            : role === UserRole.DISTRIBUTION
              ? 'Paylamalar panelində təxilasdan qayıdış etdikcə şad oluruq'
              : 'Bravo Smart Flow-a qayıdış etdikcə şad oluruq'}
        </p>
      </div>

      {/* SUPPLY DASHBOARD */}
      {role === UserRole.SUPPLY && supplyProfile && (
        <>
          {/* Company Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  {supplyProfile.company_name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  VOEN: {supplyProfile.voen}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {supplyProfile.address}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📞 {supplyProfile.phone}
                </p>
              </div>
              <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold">
                Təchizatçı
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Aktiv Sifarişlər
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    —
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Bu Ay Satışlar
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    —
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Distribyutorlar
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    —
                  </p>
                </div>
                <Truck className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </div>
          </div>

          {/* Welcome Card */}
          <div className="mt-8 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-200">
              📦 Təchizatçı Paneli
            </h2>
            <p className="text-orange-800 dark:text-orange-300 mt-2">
              Burada sifarişlərinizi idarə edə, distribyutorlarla əlaqə saxlaya və satış
              statistikasını izləyə bilərsiniz.
            </p>
          </div>
        </>
      )}

      {/* DISTRIBUTION DASHBOARD */}
      {role === UserRole.DISTRIBUTION && distributionProfile && (
        <>
          {/* User Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  {distributionProfile.first_name} {distributionProfile.last_name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {firebaseUser?.email}
                </p>
              </div>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                Distribyutor
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Aktiv Paylamalar
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    —
                  </p>
                </div>
                <Truck className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Inventar
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    —
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fəaliyyət Nisbəti
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    100%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>
          </div>

          {/* Welcome Card */}
          <div className="mt-8 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 dark:text-green-200">
              🚚 Distribyutor Paneli
            </h2>
            <p className="text-green-800 dark:text-green-300 mt-2">
              Burada paylamaları idarə edə, inventarı təhkim edə və təchizatçılarla birlikdə
              çalışa bilərsiniz.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
