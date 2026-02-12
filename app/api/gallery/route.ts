import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createGalleryItemSchema } from '@/lib/validations/gallery';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where = {
      ...(category && { category }),
      ...(active !== null && { isActive: active === 'true' }),
    };

    const items = await db.galleryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const body = await request.json();
    const data = createGalleryItemSchema.parse(body);

    const item = await db.galleryItem.create({ data });
    return successResponse(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
