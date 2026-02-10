import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateBlogPostSchema } from '@/lib/validations/blog';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const post = await db.blogPost.findUnique({ where: { id } });

    if (!post) return errorResponse('Blog yazısı bulunamadı', 404);
    return successResponse(post);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateBlogPostSchema.parse(body);

    const post = await db.blogPost.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
    });
    return successResponse(post);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.blogPost.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
