"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { forgotPasswordSchema, ForgotPasswordFormData } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import Image from "next/image";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setGeneralError(null);
      setSuccessMessage(null);
      await resetPassword(data.email);
      setSuccessMessage(
        "Şifrə sıfırlaması linki email-ə göndərildi. Email-i kontrol edin."
      );
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Şifrə sıfırlanması uğursuz oldu";
      setGeneralError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-8">
        
        <div>
          <Image src="/bravologo.png" alt="Bravo" width={50} height={50} className="mx-auto mb-1" />
          <h3 className="w-full text-center text-[#75ba4b] text-xl mb-2">Bravo Smart Flow</h3>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Şifrəni Sıfırla
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-6">
          Şifrənizi sıfırlamaq üçün email-i daxil edin
        </p>

        {generalError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {generalError}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 rounded">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            icon={<Mail className="h-4 w-4" />}
            {...register("email")}
            error={errors.email?.message}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            className="w-full"
          >
            Sıfırlama linki göndər
          </Button>
        </form>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          <Link
            href="/login"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Geri qayıt
          </Link>
        </p>
      </div>
    </div>
  );
}
