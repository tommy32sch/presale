import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/jwt';

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
