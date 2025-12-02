import { Product } from '../types';

export const productCategories = [
    { value: 'all', label: 'Tümü' },
    { value: 'Botulinum Toksin', label: 'Botoks' },
    { value: 'Dermal Dolgu', label: 'Dolgu' },
    { value: 'Bio-Remodelling', label: 'Gençlik Aşısı' },
    { value: 'Kollajen Stimülatörü', label: 'Kollajen' },
    { value: 'Bio-Stimülatör', label: 'Bio-Stimülatör' }
];

export function getProductBySlug(slug: string) {
    // Since products don't have a slug field in the current data, we'll generate one or find by id if slug matches
    // For now, let's assume we find by id or name-based slug
    return products.find(p => p.id === slug || p.name.toLowerCase().replace(/ /g, '-') === slug);
}

export const products: Product[] = [
    {
        id: '1',
        slug: 'botox-cosmetic',
        name: 'Botox Cosmetic',
        brand: 'Allergan',
        category: 'Botulinum Toksin',
        description: 'FDA onaylı, dünya çapında en çok kullanılan botoks ürünü. Yüksek saflık ve uzun süreli etki.',
        image: '/images/products/botox.jpg',
        features: [
            'FDA ve CE onaylı',
            '4-6 ay etkili',
            'Yüksek saflık',
            'Minimal yan etki',
            'Doğal sonuçlar'
        ],
        price: '2.500 TL'
    },
    {
        id: '2',
        slug: 'juvederm',
        name: 'Juvéderm',
        brand: 'Allergan',
        category: 'Dermal Dolgu',
        description: 'Hyaluronik asit bazlı premium dolgu ürünü. Doğal ve uzun süreli hacim kazanımı.',
        image: '/images/products/juvederm.jpg',
        features: [
            'Hyaluronik asit bazlı',
            '12-18 ay etkili',
            'Vycross teknolojisi',
            'Doğal görünüm',
            'Geri dönüşümlü'
        ],
        price: '3.500 TL'
    },
    {
        id: '3',
        slug: 'restylane',
        name: 'Restylane',
        brand: 'Galderma',
        category: 'Dermal Dolgu',
        description: 'İsveç yapımı premium hyaluronik asit dolgu. Dudak ve yüz konturları için ideal.',
        image: '/images/products/restylane.jpg',
        features: [
            'NASHA teknolojisi',
            '9-12 ay etkili',
            'Doğal hacim',
            'Minimal şişlik',
            'Hızlı iyileşme'
        ],
        price: '3.200 TL'
    },
    {
        id: '4',
        slug: 'profhilo',
        name: 'Profhilo',
        brand: 'IBSA',
        category: 'Bio-Remodelling',
        description: 'Yeni nesil cilt gençleştirme ürünü. Yüksek konsantrasyonlu hyaluronik asit ile cilt kalitesini artırır.',
        image: '/images/products/profhilo.jpg',
        features: [
            'Bio-remodelling teknolojisi',
            'Kolajen ve elastin üretimi',
            'Cilt kalitesini artırır',
            '6 ay etkili',
            'Minimal enjeksiyon noktası'
        ],
        price: '4.000 TL'
    },
    {
        id: '5',
        slug: 'sculptra',
        name: 'Sculptra',
        brand: 'Galderma',
        category: 'Kollajen Stimülatörü',
        description: 'Poly-L-lactic asit bazlı kollajen stimülatörü. Doğal ve uzun süreli hacim kazanımı.',
        image: '/images/products/sculptra.jpg',
        features: [
            'Kollajen üretimini artırır',
            '2 yıla kadar etkili',
            'Doğal sonuçlar',
            'Kademeli iyileşme',
            'Uzun süreli etki'
        ],
        price: '5.000 TL'
    },
    {
        id: '6',
        slug: 'ellanse',
        name: 'Ellansé',
        brand: 'Sinclair',
        category: 'Bio-Stimülatör',
        description: 'PCL bazlı bio-stimülatör. Anında hacim ve uzun süreli kollajen üretimi.',
        image: '/images/products/ellanse.jpg',
        features: [
            'Anında sonuç',
            '1-4 yıl etkili',
            'Kollajen stimülasyonu',
            'Doğal görünüm',
            'Biyouyumlu'
        ],
        price: '4.500 TL'
    },
];
