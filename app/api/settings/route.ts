import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateSiteSettingsSchema } from '@/lib/validations/settings';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    let settings = await db.siteSettings.findUnique({ where: { id: 'main' } });

    if (!settings) {
      settings = await db.siteSettings.create({ data: { id: 'main' } });
    }

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse('Yetkilendirme gerekli', 401);

    const body = await request.json();
    const data = updateSiteSettingsSchema.parse(body);

    const settings = await db.siteSettings.upsert({
      where: { id: 'main' },
      update: data,
      create: { id: 'main', ...data },
    });

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
