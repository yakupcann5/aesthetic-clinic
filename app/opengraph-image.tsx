import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Aesthetic Clinic - Güzellik ve Estetik Merkezi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                    padding: '60px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            fontSize: 28,
                            color: '#a5b4fc',
                            letterSpacing: '4px',
                            textTransform: 'uppercase',
                            marginBottom: '20px',
                        }}
                    >
                        Aesthetic Clinic
                    </div>
                    <div
                        style={{
                            fontSize: 56,
                            fontWeight: 700,
                            color: '#ffffff',
                            lineHeight: 1.2,
                            marginBottom: '24px',
                        }}
                    >
                        Güzellik ve Estetik Merkezi
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            color: '#c7d2fe',
                            maxWidth: '800px',
                            lineHeight: 1.6,
                        }}
                    >
                        Botoks, Dolgu, Lazer Epilasyon ve daha fazlası için uzman kadromuzla hizmetinizdeyiz.
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '40px',
                            fontSize: 18,
                            color: '#a5b4fc',
                        }}
                    >
                        <span>İstanbul, Kadıköy</span>
                        <span style={{ color: '#6366f1' }}>•</span>
                        <span>+90 555 123 45 67</span>
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
