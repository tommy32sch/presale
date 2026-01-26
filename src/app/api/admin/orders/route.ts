import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { normalizePhone } from '@/lib/utils/phone';

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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const {
      order_number,
      customer_name,
      customer_email,
      customer_phone,
      items_description,
      quantity = 1,
    } = body;

    // Validate required fields
    if (!order_number || !customer_name || !customer_email || !customer_phone || !items_description) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const supabase = db();

    // Check if order number already exists
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order_number)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Order number already exists' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(customer_phone);

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_phone_normalized: normalizedPhone,
        items_description,
        quantity,
      })
      .select()
      .single();

    if (error) {
      console.error('Order creation error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Initialize progress for all stages
    const { data: stages } = await supabase
      .from('stages')
      .select('id')
      .order('sort_order');

    if (stages && stages.length > 0) {
      const progressRecords = stages.map((stage) => ({
        order_id: order.id,
        stage_id: stage.id,
        status: 'not_started',
      }));

      await supabase.from('order_progress').insert(progressRecords);
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
