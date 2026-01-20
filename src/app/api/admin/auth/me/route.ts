import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.sub,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
