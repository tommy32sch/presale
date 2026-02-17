import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/jwt';
import { db } from '@/lib/supabase/server';

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch shop name from Shopify connection
    let shopName: string | null = null;
    try {
      const supabase = db();
      const { data } = await supabase
        .from('shopify_connection')
        .select('shop_name')
        .eq('id', 'default')
        .single();
      shopName = data?.shop_name || null;
    } catch {
      // No connection yet — that's fine
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.sub,
        email: admin.email,
        name: admin.name,
      },
      shopName,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
