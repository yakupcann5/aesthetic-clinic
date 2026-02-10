import { ImageResponse } from 'next/og';
import { getBlogPostBySlug, blogPosts } from '@/lib/data/blog';

export const alt = 'Aesthetic Clinic Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
    return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = getBlogPostBySlug(slug);

    const title = post?.title ?? 'Blog Yazısı';
    const author = post?.author ?? '';
    const date = post?.date ?? '';
    const readTime = post?.readTime ?? '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    padding: '60px',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                        style={{
                            fontSize: 16,
                            color: '#94a3b8',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            marginBottom: '24px',
                        }}
                    >
                        Blog
                    </div>
                    <div
                        style={{
                            fontSize: 48,
                            fontWeight: 700,
                            color: '#ffffff',
                            lineHeight: 1.2,
                            marginBottom: '24px',
                            maxWidth: '900px',
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '24px',
                            fontSize: 18,
                            color: '#94a3b8',
                        }}
                    >
                        <span>{author}</span>
                        <span style={{ color: '#475569' }}>•</span>
                        <span>{date}</span>
                        <span style={{ color: '#475569' }}>•</span>
                        <span>{readTime}</span>
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
