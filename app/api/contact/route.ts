import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createContactMessageSchema } from '@/lib/validations/contact';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const messages = await db.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(messages);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createContactMessageSchema.parse(body);

    const message = await db.contactMessage.create({ data });
    return successResponse(message, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
