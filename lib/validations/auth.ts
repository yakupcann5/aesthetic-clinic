import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
