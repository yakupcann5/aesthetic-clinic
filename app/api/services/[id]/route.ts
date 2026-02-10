import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateServiceSchema } from '@/lib/validations/service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const service = await db.service.findUnique({ where: { id } });

    if (!service) return errorResponse('Hizmet bulunamadı', 404);
    return successResponse(service);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateServiceSchema.parse(body);

    const service = await db.service.update({ where: { id }, data });
    return successResponse(service);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.service.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
