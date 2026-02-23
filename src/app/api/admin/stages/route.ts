import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const clientIP = getClientIP(request.headers);
  const rateLimit = await checkConfiguredRateLimit(`admin-stages:${clientIP}`, 'admin-stages', 60, '1 m');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const supabase = db();

    const { data: stages, error } = await supabase
      .from('stages')
      .select('*')
      .order('sort_order');

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stages: stages || [],
    });
  } catch (error) {
    console.error('Stages fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
