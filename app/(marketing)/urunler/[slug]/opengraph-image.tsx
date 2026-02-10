import { ImageResponse } from 'next/og';
import { getProductBySlug, products } from '@/lib/data/products';

export const runtime = 'edge';
export const alt = 'Aesthetic Clinic Ürün';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const product = getProductBySlug(slug);

    const name = product?.name ?? 'Ürün';
    const brand = product?.brand ?? '';
    const price = product?.price ?? '';
    const description = product?.description ?? '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    padding: '60px',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            fontSize: 18,
                            color: '#a5b4fc',
                            marginBottom: '12px',
                        }}
                    >
                        {brand}
                    </div>
                    <div
                        style={{
                            fontSize: 52,
                            fontWeight: 700,
                            color: '#ffffff',
                            lineHeight: 1.2,
                            marginBottom: '20px',
                        }}
                    >
                        {name}
                    </div>
                    <div
                        style={{
                            fontSize: 20,
                            color: '#94a3b8',
                            maxWidth: '800px',
                            lineHeight: 1.5,
                            marginBottom: '24px',
                        }}
                    >
                        {description.length > 150 ? description.slice(0, 150) + '...' : description}
                    </div>
                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 700,
                            color: '#a5b4fc',
                        }}
                    >
                        {price}
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ fontSize: 24, color: '#a5b4fc' }}>
                        Aesthetic Clinic
                    </div>
                    <div style={{ fontSize: 18, color: '#64748b' }}>
                        aestheticclinic.com
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
