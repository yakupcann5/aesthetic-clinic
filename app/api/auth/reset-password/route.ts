import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'E-posta adresi gereklidir' },
        { status: 400 }
      );
    }

    // Check if user exists (don't reveal if they don't for security)
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    // In production, send actual reset email here if user exists
    if (user) {
      // TODO: Generate reset token, save to DB, send email
      console.log(`Password reset requested for: ${email}`);
    }

    return NextResponse.json({
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
    });
  } catch {
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
