import { z } from 'zod';

export const createContactMessageSchema = z.object({
  name: z.string().min(1, 'Ad soyad zorunludur'),
  email: z.string().email('Geçersiz e-posta adresi'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Konu zorunludur'),
  message: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır'),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;
