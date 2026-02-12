import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateGalleryItemSchema } from '@/lib/validations/gallery';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const item = await db.galleryItem.findUnique({ where: { id } });

    if (!item) return errorResponse('Galeri öğesi bulunamadı', 404);
    return successResponse(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const { id } = await params;
    const body = await request.json();
    const data = updateGalleryItemSchema.parse(body);

    const item = await db.galleryItem.update({ where: { id }, data });
    return successResponse(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const { id } = await params;
    await db.galleryItem.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
