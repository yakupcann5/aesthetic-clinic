import { ImageResponse } from 'next/og';
import { getServiceBySlug, services } from '@/lib/data/services';

export const alt = 'Aesthetic Clinic Hizmet';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
    return services.map((service) => ({ slug: service.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const service = getServiceBySlug(slug);

    const title = service?.title ?? 'Hizmet';
    const description = service?.shortDescription ?? '';
    const category = service?.category ?? '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                    padding: '60px',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '24px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 16,
                                color: '#c7d2fe',
                                background: 'rgba(99, 102, 241, 0.3)',
                                padding: '6px 16px',
                                borderRadius: '20px',
                            }}
                        >
                            {category}
                        </div>
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
                        {title}
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            color: '#c7d2fe',
                            maxWidth: '800px',
                            lineHeight: 1.5,
                        }}
                    >
                        {description}
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
                    <div style={{ fontSize: 18, color: '#818cf8' }}>
                        aestheticclinic.com
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
