"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { loginSchema, LoginFormData } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import Image from "next/image";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setGeneralError(null);
      await login(data.email, data.password);
      router.push("/home");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Giriş uğursuz oldu";
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

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Xoş gəldiniz
        </h1>

        {generalError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {generalError}
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

          <Input
            label="Şifrə"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            error={errors.password?.message}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              {...register("rememberMe")}
              className="h-4 w-4 text-indigo-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Məni xatırla
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            className="w-full"
          >
            Daxil ol
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p>
            <Link
              href="/forgot-password"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Şifrəmi unutdum
            </Link>
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Hesabınız yoxdur?{" "}
            <Link
              href="/register"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Qeydiyyat
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
