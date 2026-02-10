import { z } from 'zod';

export const createBlogPostSchema = z.object({
  slug: z.string().min(1, 'Slug zorunludur').regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir'),
  title: z.string().min(1, 'Başlık zorunludur'),
  excerpt: z.string().min(1, 'Özet zorunludur'),
  content: z.string().min(1, 'İçerik zorunludur'),
  author: z.string().min(1, 'Yazar zorunludur'),
  category: z.string().min(1, 'Kategori zorunludur'),
  image: z.string().optional(),
  tags: z.array(z.string()).default([]),
  readTime: z.string().min(1, 'Okuma süresi zorunludur'),
  isPublished: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
