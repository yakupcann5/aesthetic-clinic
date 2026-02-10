import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createContactMessageSchema } from '@/lib/validations/contact';
import { successResponse, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
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
