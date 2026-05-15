import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Düzgün email daxil edin")
    .min(1, "Email mütləq daxil edilməlidir"),
  password: z
    .string()
    .min(6, "Şifrə minimum 6 simvoldan ibarət olmalıdır")
    .min(1, "Şifrə mütləq daxil edilməlidir"),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Ad minimum 2 simvoldan ibarət olmalıdır")
      .min(1, "Ad mütləq daxil edilməlidir"),
    email: z
      .string()
      .email("Düzgün email daxil edin")
      .min(1, "Email mütləq daxil edilməlidir"),
    password: z
      .string()
      .min(6, "Şifrə minimum 6 simvoldan ibarət olmalıdır")
      .min(1, "Şifrə mütləq daxil edilməlidir"),
    confirmPassword: z
      .string()
      .min(1, "Şifrə təsdiq mütləq daxil edilməlidir"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifrələr uyğun gəlmir",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Düzgün email daxil edin")
    .min(1, "Email mütləq daxil edilməlidir"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Cari şifrə mütləq daxil edilməlidir"),
    newPassword: z
      .string()
      .min(6, "Yeni şifrə minimum 6 simvoldan ibarət olmalıdır")
      .min(1, "Yeni şifrə mütləq daxil edilməlidir"),
    confirmPassword: z
      .string()
      .min(1, "Şifrə təsdiq mütləq daxil edilməlidir"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Şifrələr uyğun gəlmir",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Ad minimum 2 simvoldan ibarət olmalıdır")
    .min(1, "Ad mütləq daxil edilməlidir"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
