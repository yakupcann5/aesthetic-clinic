import type { MetadataRoute } from 'next';
import { services } from '@/lib/data/services';
import { products } from '@/lib/data/products';
import { blogPosts } from '@/lib/data/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aestheticclinic.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${siteUrl}/hizmetler`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/urunler`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${siteUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${siteUrl}/galeri`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${siteUrl}/randevu`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/iletisim`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
    ];

    const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
        url: `${siteUrl}/hizmetler/${service.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${siteUrl}/urunler/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'yearly' as const,
        priority: 0.6,
    }));

    return [...staticPages, ...servicePages, ...productPages, ...blogPages];
}
