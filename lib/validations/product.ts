import { z } from 'zod';

export const createProductSchema = z.object({
  slug: z.string().min(1, 'Slug zorunludur').regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir'),
  name: z.string().min(1, 'Ürün adı zorunludur'),
  brand: z.string().min(1, 'Marka zorunludur'),
  category: z.string().min(1, 'Kategori zorunludur'),
  description: z.string().min(1, 'Açıklama zorunludur'),
  price: z.string().min(1, 'Fiyat zorunludur'),
  image: z.string().optional(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
