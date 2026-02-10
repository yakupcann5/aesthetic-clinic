// Common Types
export interface Service {
    id: string;
    slug: string;
    title: string;
    category: string;
    shortDescription: string;
    description: string;
    price: string;
    duration: string;
    image: string;
    benefits: string[];
    process: string[];
    recovery: string;
    beforeAfterImages?: string[];
}

export interface Product {
    id: string;
    slug: string;
    name: string;
    brand: string;
    category: string;
    description: string;
    price: string;
    image: string;
    features: string[];
}

export interface GalleryItem {
    id: string;
    category: string;
    service: string;
    beforeImage: string;
    afterImage: string;
    description: string;
    date: string;
}

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    author: string;
    date: string;
    category: string;
    image: string;
    tags: string[];
    readTime: string;
}

export interface Testimonial {
    id: string;
    name: string;
    service: string;
    rating: number;
    comment: string;
    date: string;
    image?: string;
}

export interface AppointmentFormData {
    name: string;
    email: string;
    phone: string;
    service: string;
    date: string;
    time: string;
    notes?: string;
}

export interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

export interface Statistics {
    patients: number;
    successRate: number;
    experience: number;
    services: number;
}
