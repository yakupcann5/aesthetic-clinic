import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const messages = error.issues.map((e: { message: string }) => e.message).join(', ');
    return errorResponse(messages, 400);
  }

  console.error('API Error:', error);
  return errorResponse('Sunucu hatası', 500);
}
