import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aestheticclinic.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/', '/giris', '/kayit', '/sifre-sifirla'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
