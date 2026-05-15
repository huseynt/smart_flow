/**
 * Unauthorized Page
 * Shown when user tries to access a page they don't have permission for
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 dark:bg-red-900 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Qadağan
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Bu səhifəyə giriş icazəniz yoxdur. Lütfən öz rol səhifəsinə qayıdın.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/home')}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Ana Səhifəyə Qayıt
          </Button>

          <Link href="/home">
            <Button variant="secondary" size="md" className="w-full">
              Əsas Səhifə
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
