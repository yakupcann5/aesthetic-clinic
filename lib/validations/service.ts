import { z } from 'zod';

export const createServiceSchema = z.object({
  slug: z.string().min(1, 'Slug zorunludur').regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir'),
  title: z.string().min(1, 'Başlık zorunludur'),
  category: z.string().min(1, 'Kategori zorunludur'),
  shortDescription: z.string().min(1, 'Kısa açıklama zorunludur'),
  description: z.string().min(1, 'Açıklama zorunludur'),
  price: z.string().min(1, 'Fiyat zorunludur'),
  duration: z.string().min(1, 'Süre zorunludur'),
  image: z.string().optional(),
  benefits: z.array(z.string()).default([]),
  process: z.array(z.string()).default([]),
  recovery: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
