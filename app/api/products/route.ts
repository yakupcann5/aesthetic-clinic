import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createProductSchema } from '@/lib/validations/product';
import { successResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where = {
      ...(category && { category }),
      ...(active !== null && { isActive: active === 'true' }),
    };

    const products = await db.product.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return successResponse(products);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProductSchema.parse(body);

    const product = await db.product.create({ data });
    return successResponse(product, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
