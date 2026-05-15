/**
 * Profile Settings Page
 * Allows users to edit their role-specific profile information
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';
import { useDistributionProfile } from '@/hooks/useDistributionProfile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateSupplyProfileSchema,
  updateDistributionProfileSchema,
  UpdateSupplyProfileFormData,
  UpdateDistributionProfileFormData,
} from '@/lib/validations';
import { Building2, Phone, FileText, MapPin, User } from 'lucide-react';

type FormData = UpdateSupplyProfileFormData | UpdateDistributionProfileFormData;

export default function ProfileSettingsPage() {
  // Protect route
  useRequireAuth();

  const role = useRole();
  const supplyProfile = useSupplyProfile();
  const distributionProfile = useDistributionProfile();
  const { loading } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Supply profile form
  const supplyForm = useForm<UpdateSupplyProfileFormData>({
    resolver: zodResolver(updateSupplyProfileSchema),
    defaultValues: supplyProfile
      ? {
          first_name: supplyProfile.first_name || '',
          last_name: supplyProfile.last_name || '',
          company_name: supplyProfile.company_name || '',
          address: supplyProfile.address || '',
          phone: supplyProfile.phone || '',
          voen: supplyProfile.voen || '',
          image_url: supplyProfile.image_url || '',
        }
      : undefined,
  });

  // Distribution profile form
  const distributionForm = useForm<UpdateDistributionProfileFormData>({
    resolver: zodResolver(updateDistributionProfileSchema),
    defaultValues: distributionProfile
      ? {
          first_name: distributionProfile.first_name || '',
          last_name: distributionProfile.last_name || '',
          image_url: distributionProfile.image_url || '',
        }
      : undefined,
  });

  const handleSupplySubmit = async (data: UpdateSupplyProfileFormData) => {
    try {
      setGeneralError(null);
      setSuccessMessage(null);

      // TODO: Call supply profile update service
      console.log('Updating supply profile:', data);

      setSuccessMessage('Profil uğurla yeniləndi');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Profil yəniləniləsi uğursuz oldu';
      setGeneralError(errorMessage);
    }
  };

  const handleDistributionSubmit = async (data: UpdateDistributionProfileFormData) => {
    try {
      setGeneralError(null);
      setSuccessMessage(null);

      // TODO: Call distribution profile update service
      console.log('Updating distribution profile:', data);

      setSuccessMessage('Profil uğurla yeniləndi');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Profil yəniləniləsi uğursuz oldu';
      setGeneralError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Profil Parametrləri
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {role === UserRole.SUPPLY
            ? 'Təchizatçı profilinizi redaktə edin'
            : role === UserRole.DISTRIBUTION
              ? 'Distribyutor profilinizi redaktə edin'
              : 'Profilinizi redaktə edin'}
        </p>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 rounded">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {generalError && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {generalError}
          </div>
        )}

        {/* SUPPLY PROFILE FORM */}
        {role === UserRole.SUPPLY && supplyProfile && (
          <form
            onSubmit={supplyForm.handleSubmit(handleSupplySubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Ad"
                type="text"
                placeholder="Adınız"
                icon={<User className="h-4 w-4" />}
                {...supplyForm.register('first_name')}
                error={supplyForm.formState.errors.first_name?.message}
              />

              <Input
                label="Soyad"
                type="text"
                placeholder="Soyadınız"
                icon={<User className="h-4 w-4" />}
                {...supplyForm.register('last_name')}
                error={supplyForm.formState.errors.last_name?.message}
              />
            </div>

            <Input
              label="Şirkət Adı"
              type="text"
              placeholder="Şirkətinizin adı"
              icon={<Building2 className="h-4 w-4" />}
              {...supplyForm.register('company_name')}
              error={supplyForm.formState.errors.company_name?.message}
            />

            <Input
              label="Ünvan"
              type="text"
              placeholder="Şirkətin ünvanı"
              icon={<MapPin className="h-4 w-4" />}
              {...supplyForm.register('address')}
              error={supplyForm.formState.errors.address?.message}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Telefon"
                type="tel"
                placeholder="+994 50 XXX XX XX"
                icon={<Phone className="h-4 w-4" />}
                {...supplyForm.register('phone')}
                error={supplyForm.formState.errors.phone?.message}
              />

              <Input
                label="VOEN"
                type="text"
                placeholder="Vergi nömrəsi"
                icon={<FileText className="h-4 w-4" />}
                {...supplyForm.register('voen')}
                error={supplyForm.formState.errors.voen?.message}
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={supplyForm.formState.isSubmitting}
              >
                Dəyişiklikləri Saxla
              </Button>
            </div>
          </form>
        )}

        {/* DISTRIBUTION PROFILE FORM */}
        {role === UserRole.DISTRIBUTION && distributionProfile && (
          <form
            onSubmit={distributionForm.handleSubmit(handleDistributionSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Ad"
                type="text"
                placeholder="Adınız"
                icon={<User className="h-4 w-4" />}
                {...distributionForm.register('first_name')}
                error={distributionForm.formState.errors.first_name?.message}
              />

              <Input
                label="Soyad"
                type="text"
                placeholder="Soyadınız"
                icon={<User className="h-4 w-4" />}
                {...distributionForm.register('last_name')}
                error={distributionForm.formState.errors.last_name?.message}
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={distributionForm.formState.isSubmitting}
              >
                Dəyişiklikləri Saxla
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
