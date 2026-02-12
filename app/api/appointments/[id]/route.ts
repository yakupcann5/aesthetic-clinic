import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateAppointmentStatusSchema } from '@/lib/validations/appointment';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const { id } = await params;
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!appointment) return errorResponse('Randevu bulunamadı', 404);
    return successResponse(appointment);
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
    const data = updateAppointmentStatusSchema.parse(body);

    const appointment = await db.appointment.update({ where: { id }, data });
    return successResponse(appointment);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const { id } = await params;
    await db.appointment.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
