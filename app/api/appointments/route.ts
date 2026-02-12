import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createAppointmentSchema } from '@/lib/validations/appointment';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    const where = {
      ...(status && { status: status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' }),
    };

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return successResponse(appointments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createAppointmentSchema.parse(body);

    const appointment = await db.appointment.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
    });
    return successResponse(appointment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
