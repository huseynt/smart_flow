"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfile } from "firebase/auth";
import { updateProfileSchema, UpdateProfileFormData } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { auth } from "@/lib/firebase";
import { getFirebaseErrorMessage } from "@/lib/errorMessages";

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
    },
  });

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      setSuccessMessage(null);
      setGeneralError(null);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: data.displayName,
        });
        setSuccessMessage("Profil uğurla yeniləndi");
        reset(data);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Profil yenilənməsi uğursuz oldu";
      setGeneralError(errorMessage);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Hesab Parametrləri
      </h1>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profil Məlumatları
        </h2>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 rounded">
            {successMessage}
          </div>
        )}

        {generalError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Ad Soyad"
            type="text"
            placeholder="Adınız"
            {...register("displayName")}
            error={errors.displayName?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Email dəyişilə bilməz
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            Yadda saxla
          </Button>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Şifrə Dəyişmə
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Şifrənizi dəyişmək üçün Firebase Console-dan və ya "Şifrəmi
          unutdum" seçənəyindən istifadə edin.
        </p>
        <Button variant="secondary">Şifrəni Sıfırla</Button>
      </div>
    </div>
  );
}
