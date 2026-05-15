"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Xoş gəldiniz, {user?.displayName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Bravo Smart Flow-a qayıdış etdikcə şad oluruq
        </p>
      </div>

      {/* Placeholder Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Aktivlik
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            —
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Məlumat yoxdur
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Statistika
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            —
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Məlumat yoxdur
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Vəziyyət
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            ✅
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Sistem aktiv
          </p>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="mt-8 bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
          🎉 Bravo Smart Flow-a xoş gəldiniz!
        </h2>
        <p className="text-indigo-800 dark:text-indigo-300 mt-2">
          Sistem istifadəyə hazırdır. Parametrlərdə hesab ayarlarınızı və dil
          tercihlərinizi tənzimləyə bilərsiz.
        </p>
      </div>
    </div>
  );
}
