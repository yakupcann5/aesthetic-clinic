import { notFound } from 'next/navigation';
import { products, getProductBySlug } from '@/lib/data/products';
import ProductDetail from '@/components/products/ProductDetail';
import JsonLd from '@/components/seo/JsonLd';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import type { Metadata } from 'next';

type Props = {
    params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const product = getProductBySlug(slug);

    if (!product) {
        return { title: 'Ürün Bulunamadı | Aesthetic Clinic' };
    }

    return {
        title: `${product.name} - ${product.brand} | Aesthetic Clinic`,
        description: product.description,
        openGraph: {
            title: `${product.name} - ${product.brand} | Aesthetic Clinic`,
            description: product.description,
            type: 'website',
        },
    };
}

export default async function ProductDetailPage({ params }: Props) {
    const { slug } = await params;
    const product = getProductBySlug(slug);

    if (!product) notFound();

    return (
        <>
            <JsonLd data={productJsonLd(product)} />
            <JsonLd data={breadcrumbJsonLd([
                { name: 'Ana Sayfa', url: '/' },
                { name: 'Ürünler', url: '/urunler' },
                { name: product.name, url: `/urunler/${product.slug}` },
            ])} />
            <ProductDetail product={product} />
        </>
    );
}
