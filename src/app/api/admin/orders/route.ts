import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const stage = searchParams.get('stage') || '';
    const status = searchParams.get('status') || ''; // delayed, active, completed

    const offset = (page - 1) * limit;
    const supabase = db();

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_progress(
          *,
          stage:stages(*)
        )
      `, { count: 'exact' })
      .eq('is_cancelled', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }

    // Apply status filter
    if (status === 'delayed') {
      query = query.eq('is_delayed', true);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
