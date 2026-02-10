import { z } from 'zod';

export const createAppointmentSchema = z.object({
  name: z.string().min(1, 'Ad soyad zorunludur'),
  email: z.string().email('Geçersiz e-posta adresi'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
  service: z.string().min(1, 'Hizmet seçimi zorunludur'),
  date: z.string().min(1, 'Tarih zorunludur'),
  time: z.string().min(1, 'Saat zorunludur'),
  message: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
