'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User, Building2, MapPin, Phone, FileText, Image as ImageIcon } from 'lucide-react';
import {
  registerSupplySchema,
  registerDistributionSchema,
  roleSelectionSchema,
  RegisterSupplyFormData,
  RegisterDistributionFormData,
  RoleSelectionFormData,
} from '@/lib/validations';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, RegisterFormData } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import Image from 'next/image';

type FormData = RegisterSupplyFormData | RegisterDistributionFormData;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Step 1: Role selection form
  const roleForm = useForm<RoleSelectionFormData>({
    resolver: zodResolver(roleSelectionSchema),
    defaultValues: { role: UserRole.SUPPLY },
  });

  // Step 2: Detailed form (dynamic based on role)
  const detailForm = useForm<FormData>({
    resolver: zodResolver(
      selectedRole === UserRole.SUPPLY ? registerSupplySchema : registerDistributionSchema
    ),
    defaultValues: {
      role: selectedRole,
    } as any,
  });

  /**
   * Reset form when role changes
   */
  useEffect(() => {
    if (selectedRole && step === 2) {
      console.log('Role changed to:', selectedRole, '- resetting form');
      detailForm.reset({
        role: selectedRole,
      } as any);
    }
  }, [selectedRole, step, detailForm]);

  /**
   * Handle role selection
   */
  const handleRoleSubmit = async (data: RoleSelectionFormData) => {
    try {
      setGeneralError(null);
      console.log('Role selected:', data.role);
      setSelectedRole(data.role as UserRole);
      setStep(2);
    } catch (error) {
      console.error('Role selection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Rol seçilə bilmədi';
      setGeneralError(errorMessage);
    }
  };

  /**
   * Handle detailed form submission
   */
  const handleDetailSubmit = async (data: FormData) => {
    console.log('=== HANDLE DETAIL SUBMIT CALLED ===');
    console.log('Form data received:', data);
    
    try {
      setGeneralError(null);
      console.log('=== REGISTRATION START ===');
      
      // Add role to form data (it's known from step 1, not submitted by form)
      const dataWithRole = {
        ...data,
        role: selectedRole!,
      } as RegisterFormData;
      
      console.log('Registration started with data:', {
        role: dataWithRole.role,
        email: dataWithRole.email,
        first_name: 'first_name' in dataWithRole ? dataWithRole.first_name : 'N/A',
      });

      // Register user
      await registerUser(dataWithRole.role, dataWithRole);
      console.log('=== REGISTRATION COMPLETE ===');
      console.log('User registered successfully, redirecting to /home');

      // Small delay to ensure auth state is settled
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to dashboard
      router.push('/home');
    } catch (error) {
      console.error('=== REGISTRATION ERROR ===', error);
      const errorMessage = error instanceof Error ? error.message : 'Qeydiyyat uğursuz oldu';
      setGeneralError(errorMessage);
      console.log('Error message set:', errorMessage);
    }
  };
  
  /**
   * Log form validation errors for debugging
   */
  const logFormErrors = () => {
    const errors = detailForm.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.log('=== FORM VALIDATION ERRORS ===');
      Object.entries(errors).forEach(([key, error]) => {
        console.log(`  ${key}:`, (error as any)?.message);
      });
    } else {
      console.log('=== NO FORM VALIDATION ERRORS ===');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-8">
        {/* Logo */}
        <div>
          <Image
            src="/bravologo.png"
            alt="Bravo"
            width={50}
            height={50}
            className="mx-auto mb-1"
          />
          <h3 className="w-full text-center text-[#75ba4b] text-xl mb-2">
            Bravo Smart Flow
          </h3>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-left">
          {step === 1 ? 'Qeydiyyat' : 'Profilinizi Tamamlayın'}
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {step === 1
            ? 'İlk olaraq rol seçin'
            : `Step 2: ${selectedRole === UserRole.SUPPLY ? 'Təchizatçı' : 'Distribyutor'} detalları`}
        </p>

        {generalError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {generalError}
          </div>
        )}

        {/* STEP 1: Role Selection */}
        {step === 1 && (
          <form onSubmit={roleForm.handleSubmit(handleRoleSubmit)} className="space-y-4">
            <div className="space-y-3">
              {/* Supply Role Option */}
              <label className="flex items-center p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <input
                  type="radio"
                  value={UserRole.SUPPLY}
                  {...roleForm.register('role')}
                  className="h-5 w-5 text-indigo-600"
                />
                <div className="ml-3 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Təchizatçı (Supply)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Məhsulları təchiz edir, şirkət detayları lazımdır
                  </div>
                </div>
              </label>

              {/* Distribution Role Option */}
              <label className="flex items-center p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                <input
                  type="radio"
                  value={UserRole.DISTRIBUTION}
                  {...roleForm.register('role')}
                  className="h-5 w-5 text-indigo-600"
                />
                <div className="ml-3 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Distribyutor (Distribution)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Məhsulları paylaşdırır, əsas məlumatlar lazımdır
                  </div>
                </div>
              </label>
            </div>

            {roleForm.formState.errors.role && (
              <p className="text-red-600 dark:text-red-400 text-sm">
                {roleForm.formState.errors.role.message}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={roleForm.formState.isSubmitting}
              className="w-full"
            >
              Davam et
            </Button>
          </form>
        )}

        {/* STEP 2: Detailed Form */}
        {step === 2 && (
          <form
            onSubmit={detailForm.handleSubmit(handleDetailSubmit)}
            className="space-y-4"
          >
            {/* Common Fields */}
            <Input
              label="Ad"
              type="text"
              placeholder="Adınız"
              icon={<User className="h-4 w-4" />}
              {...detailForm.register('first_name')}
              error={detailForm.formState.errors.first_name?.message}
            />

            <Input
              label="Soyad"
              type="text"
              placeholder="Soyadınız"
              icon={<User className="h-4 w-4" />}
              {...detailForm.register('last_name')}
              error={detailForm.formState.errors.last_name?.message}
            />

            {/* Supply-only Fields */}
            {selectedRole === UserRole.SUPPLY && (
              <>
                <Input
                  label="Şirkət Adı"
                  type="text"
                  placeholder="Şirkətinizin adı"
                  icon={<Building2 className="h-4 w-4" />}
                  {...detailForm.register('company_name')}
                  error={
                    ('company_name' in detailForm.formState.errors ? (detailForm.formState.errors as any).company_name?.message : undefined)
                  }
                />

                <Input
                  label="Ünvan"
                  type="text"
                  placeholder="Şirkətin ünvanı"
                  icon={<MapPin className="h-4 w-4" />}
                  {...detailForm.register('address')}
                  error={('address' in detailForm.formState.errors ? (detailForm.formState.errors as any).address?.message : undefined)}
                />

                <Input
                  label="Telefon"
                  type="tel"
                  placeholder="+994 50 XXX XX XX"
                  icon={<Phone className="h-4 w-4" />}
                  {...detailForm.register('phone')}
                  error={('phone' in detailForm.formState.errors ? (detailForm.formState.errors as any).phone?.message : undefined)}
                />

                <Input
                  label="VOEN"
                  type="text"
                  placeholder="Vergi nömrəsi"
                  icon={<FileText className="h-4 w-4" />}
                  {...detailForm.register('voen')}
                  error={('voen' in detailForm.formState.errors ? (detailForm.formState.errors as any).voen?.message : undefined)}
                />
              </>
            )}

            {/* Common Auth Fields */}
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              icon={<Mail className="h-4 w-4" />}
              {...detailForm.register('email')}
              error={detailForm.formState.errors.email?.message}
            />

            <Input
              label="Şifrə"
              type="password"
              placeholder="••••••••"
              {...detailForm.register('password')}
              error={detailForm.formState.errors.password?.message}
            />

            <Input
              label="Şifrəni Təsdiq et"
              type="password"
              placeholder="••••••••"
              {...detailForm.register('confirmPassword')}
              error={detailForm.formState.errors.confirmPassword?.message}
            />

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setStep(1);
                  setSelectedRole(null);
                  setGeneralError(null);
                }}
                className="flex-1"
              >
                Geri
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={detailForm.formState.isSubmitting}
                className="flex-1"
              >
                Qeydiyyat ol
              </Button>
            </div>
          </form>
        )}

        {/* Login Link */}
        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          Artıq hesabınız var?{' '}
          <Link
            href="/login"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Daxil ol
          </Link>
        </p>
      </div>
    </div>
  );
}


