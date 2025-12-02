import { GalleryItem } from '../types';

export const galleryCategories = [
    { value: 'all', label: 'Tümü' },
    { value: 'Botoks', label: 'Botoks' },
    { value: 'Dolgu', label: 'Dolgu' },
    { value: 'Lazer', label: 'Lazer' },
    { value: 'PRP', label: 'PRP' },
    { value: 'Peeling', label: 'Peeling' }
];

export const galleryItems: GalleryItem[] = [
    {
        id: '1',
        category: 'Botoks',
        service: 'Botoks Uygulaması',
        beforeImage: '/images/before-after/botox-before-1.jpg',
        afterImage: '/images/before-after/botox-after-1.jpg',
        description: 'Alın ve göz çevresi botoks uygulaması - 2 hafta sonra',
        date: '2024-11-15',
    },
    {
        id: '2',
        category: 'Dolgu',
        service: 'Dudak Dolgusu',
        beforeImage: '/images/before-after/lip-before-1.jpg',
        afterImage: '/images/before-after/lip-after-1.jpg',
        description: 'Dudak dolgusu - Doğal hacim kazanımı',
        date: '2024-11-10',
    },
    {
        id: '3',
        category: 'Dolgu',
        service: 'Yanak Dolgusu',
        beforeImage: '/images/before-after/cheek-before-1.jpg',
        afterImage: '/images/before-after/cheek-after-1.jpg',
        description: 'Yanak konturu dolgusu - Yüz hatlarında belirginleşme',
        date: '2024-11-05',
    },
    {
        id: '4',
        category: 'Lazer',
        service: 'Lazer Epilasyon',
        beforeImage: '/images/before-after/laser-before-1.jpg',
        afterImage: '/images/before-after/laser-after-1.jpg',
        description: 'Lazer epilasyon - 6 seans sonrası',
        date: '2024-10-28',
    },
    {
        id: '5',
        category: 'PRP',
        service: 'PRP Saç Tedavisi',
        beforeImage: '/images/before-after/prp-hair-before-1.jpg',
        afterImage: '/images/before-after/prp-hair-after-1.jpg',
        description: 'PRP saç tedavisi - 4 seans sonrası',
        date: '2024-10-20',
    },
    {
        id: '6',
        category: 'Peeling',
        service: 'Kimyasal Peeling',
        beforeImage: '/images/before-after/peeling-before-1.jpg',
        afterImage: '/images/before-after/peeling-after-1.jpg',
        description: 'Kimyasal peeling - Leke tedavisi',
        date: '2024-10-15',
    },
];
