import { z } from 'zod';

export const createGalleryItemSchema = z.object({
  category: z.string().min(1, 'Kategori zorunludur'),
  service: z.string().min(1, 'Hizmet zorunludur'),
  beforeImage: z.string().min(1, 'Öncesi görseli zorunludur'),
  afterImage: z.string().min(1, 'Sonrası görseli zorunludur'),
  description: z.string().min(1, 'Açıklama zorunludur'),
  isActive: z.boolean().default(true),
});

export const updateGalleryItemSchema = createGalleryItemSchema.partial();

export type CreateGalleryItemInput = z.infer<typeof createGalleryItemSchema>;
export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemSchema>;
