import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createServiceSchema } from '@/lib/validations/service';
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

    const services = await db.service.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return successResponse(services);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createServiceSchema.parse(body);

    const service = await db.service.create({ data });
    return successResponse(service, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
