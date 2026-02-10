import { z } from 'zod';

export const updateSiteSettingsSchema = z.object({
  siteName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  address: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  youtube: z.string().optional(),
  mapEmbedUrl: z.string().optional(),
  workingHours: z.record(z.string(), z.string()).optional(),
});

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
