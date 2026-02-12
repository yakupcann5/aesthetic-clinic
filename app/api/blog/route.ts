import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createBlogPostSchema } from '@/lib/validations/blog';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const published = searchParams.get('published');

    const where = {
      ...(category && { category }),
      ...(published !== null && { isPublished: published === 'true' }),
    };

    const posts = await db.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(posts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const body = await request.json();
    const data = createBlogPostSchema.parse(body);

    const post = await db.blogPost.create({
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
    });
    return successResponse(post, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
