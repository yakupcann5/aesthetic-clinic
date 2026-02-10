import type { Service, BlogPost, Product } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aestheticclinic.com';

export function organizationJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        name: 'Aesthetic Clinic',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description: 'İstanbul Kadıköy\'de botoks, dolgu, lazer epilasyon, PRP ve profesyonel cilt bakımı hizmetleri.',
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Bağdat Caddesi No: 123',
            addressLocality: 'Kadıköy',
            addressRegion: 'İstanbul',
            addressCountry: 'TR',
        },
        telephone: '+905551234567',
        email: 'info@aestheticclinic.com',
        openingHoursSpecification: [
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '19:00',
            },
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: 'Saturday',
                opens: '10:00',
                closes: '17:00',
            },
        ],
        sameAs: [],
        priceRange: '$$',
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '15000',
        },
    };
}

export function webSiteJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Aesthetic Clinic',
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/hizmetler?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

export function serviceJsonLd(service: Service) {
    return {
        '@context': 'https://schema.org',
        '@type': 'MedicalProcedure',
        name: service.title,
        description: service.description,
        url: `${siteUrl}/hizmetler/${service.slug}`,
        procedureType: 'http://schema.org/CosmeticProcedure',
        howPerformed: service.process.join('. '),
        preparation: service.recovery || '',
        provider: {
            '@type': 'MedicalBusiness',
            name: 'Aesthetic Clinic',
            url: siteUrl,
        },
        offers: {
            '@type': 'Offer',
            price: service.price,
            priceCurrency: 'TRY',
        },
    };
}

export function blogPostJsonLd(post: BlogPost) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        url: `${siteUrl}/blog/${post.slug}`,
        datePublished: post.date,
        dateModified: post.date,
        author: {
            '@type': 'Person',
            name: post.author,
        },
        publisher: {
            '@type': 'Organization',
            name: 'Aesthetic Clinic',
            url: siteUrl,
        },
        keywords: post.tags.join(', '),
    };
}

export function productJsonLd(product: Product) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        brand: {
            '@type': 'Brand',
            name: product.brand,
        },
        url: `${siteUrl}/urunler/${product.slug}`,
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'TRY',
            availability: 'https://schema.org/InStock',
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '50',
        },
    };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${siteUrl}${item.url}`,
        })),
    };
}
