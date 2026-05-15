import { z } from "zod";
import { UserRole } from "@/types";

// =====================================================
// AUTH SCHEMAS
// =====================================================

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

/**
 * Supply user registration schema
 */
export const registerSupplySchema = z
  .object({
    role: z.literal(UserRole.SUPPLY),
    first_name: z
      .string()
      .min(2, "Ad minimum 2 simvoldan ibarət olmalıdır")
      .min(1, "Ad mütləq daxil edilməlidir"),
    last_name: z
      .string()
      .min(2, "Soyad minimum 2 simvoldan ibarət olmalıdır")
      .min(1, "Soyad mütləq daxil edilməlidir"),
    company_name: z
      .string()
      .min(2, "Şirkət adı minimum 2 simvoldan ibarət olmalıdır")
      .min(1, "Şirkət adı mütləq daxil edilməlidir"),
    email: z
      .string()
      .email("Düzgün email daxil edin")
      .min(1, "Email mütləq daxil edilməlidir"),
    address: z
      .string()
      .min(5, "Ünvan minimum 5 simvoldan ibarət olmalıdır")
      .min(1, "Ünvan mütləq daxil edilməlidir"),
    phone: z
      .string()
      .regex(/^\+?[0-9\s\-\(\)]{10,}$/, "Düzgün telefon nömrəsi daxil edin")
      .min(1, "Telefon nömrəsi mütləq daxil edilməlidir"),
    voen: z
      .string()
      .min(1, "VOEN mütləq daxil edilməlidir"),
    image_url: z.string().optional(),
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

/**
 * Distribution user registration schema
 */
export const registerDistributionSchema = z
  .object({
    role: z.literal(UserRole.DISTRIBUTION),
    first_name: z
      .string()
      .min(2, "Ad minimum 2 simvoldan ibarət olmalıdır")
      .min(1, "Ad mütləq daxil edilməlidir"),
    last_name: z
      .string()
      .min(2, "Soyad minimum 2 simvoldan ibarət olmalıdır")
      .min(1, "Soyad mütləq daxil edilməlidir"),
    email: z
      .string()
      .email("Düzgün email daxil edin")
      .min(1, "Email mütləq daxil edilməlidir"),
    image_url: z.string().optional(),
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

/**
 * Role selection schema (first step of registration)
 */
export const roleSelectionSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: "Rolu seçin" }),
  }),
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

// =====================================================
// PROFILE UPDATE SCHEMAS
// =====================================================

export const updateSupplyProfileSchema = z.object({
  first_name: z
    .string()
    .min(2, "Ad minimum 2 simvoldan ibarət olmalıdır")
    .optional(),
  last_name: z
    .string()
    .min(2, "Soyad minimum 2 simvoldan ibarət olmalıdır")
    .optional(),
  company_name: z
    .string()
    .min(2, "Şirkət adı minimum 2 simvoldan ibarət olmalıdır")
    .optional(),
  address: z
    .string()
    .min(5, "Ünvan minimum 5 simvoldan ibarət olmalıdır")
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-\(\)]{10,}$/, "Düzgün telefon nömrəsi daxil edin")
    .optional(),
  voen: z
    .string()
    .optional(),
  image_url: z.string().optional(),
});

export const updateDistributionProfileSchema = z.object({
  first_name: z
    .string()
    .min(2, "Ad minimum 2 simvoldan ibarət olmalıdır")
    .optional(),
  last_name: z
    .string()
    .min(2, "Soyad minimum 2 simvoldan ibarət olmalıdır")
    .optional(),
  image_url: z.string().optional(),
});

// =====================================================
// FORM DATA TYPE EXPORTS
// =====================================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterSupplyFormData = z.infer<typeof registerSupplySchema>;
export type RegisterDistributionFormData = z.infer<typeof registerDistributionSchema>;
export type RoleSelectionFormData = z.infer<typeof roleSelectionSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateSupplyProfileFormData = z.infer<typeof updateSupplyProfileSchema>;
export type UpdateDistributionProfileFormData = z.infer<typeof updateDistributionProfileSchema>;


