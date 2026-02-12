import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateProductSchema } from '@/lib/validations/product';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({ where: { id } });

    if (!product) return errorResponse('Ürün bulunamadı', 404);
    return successResponse(product);
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
    const data = updateProductSchema.parse(body);

    const product = await db.product.update({ where: { id }, data });
    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const { id } = await params;
    await db.product.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
