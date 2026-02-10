import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return errorResponse('Bu e-posta adresi zaten kayıtlı', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    return successResponse(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
