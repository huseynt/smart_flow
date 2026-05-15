"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, User } from "lucide-react";
import { registerSchema, RegisterFormData } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import Image from "next/image";

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setGeneralError(null);
      await signUp(data.email, data.password, data.name);
      router.push("/home");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Qeydiyyat uğursuz oldu";
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
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-left">
          Qeydiyyat
        </h1>

        {generalError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {generalError}
          </div>
        )}

        

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Ad Soyad"
            type="text"
            placeholder="Adınız Soyadınız"
            icon={<User className="h-4 w-4" />}
            {...register("name")}
            error={errors.name?.message}
          />

          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            icon={<Mail className="h-4 w-4" />}
            {...register("email")}
            error={errors.email?.message}
          />

          <Input
            label="Şifrə"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            error={errors.password?.message}
          />

          <Input
            label="Şifrəni Təsdiq et"
            type="password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            className="w-full"
          >
            Qeydiyyat ol
          </Button>
        </form>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          Artıq hesabınız var?{" "}
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
