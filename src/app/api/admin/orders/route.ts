import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { normalizePhone } from '@/lib/utils/phone';
import { escapePostgrestValue, validateMaxLength, LIMITS } from '@/lib/utils/validation';

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
      const lengthError = validateMaxLength(search, LIMITS.SEARCH_QUERY, 'search');
      if (lengthError) {
        return NextResponse.json({ success: false, error: lengthError }, { status: 400 });
      }
      const escaped = escapePostgrestValue(search);
      query = query.or(`order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_email.ilike.%${escaped}%`);
    }

    // Apply stage filter (orders whose current stage matches)
    if (stage) {
      const stageId = parseInt(stage);
      if (!isNaN(stageId)) {
        const { data: selectedStage } = await supabase
          .from('stages')
          .select('sort_order')
          .eq('id', stageId)
          .single();

        if (!selectedStage) {
          return NextResponse.json({
            success: true,
            orders: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }

        // 1) Orders where this stage is currently in_progress
        const { data: inProgressOrders } = await supabase
          .from('order_progress')
          .select('order_id')
          .eq('stage_id', stageId)
          .eq('status', 'in_progress');

        const inProgressIds = inProgressOrders?.map((p) => p.order_id) || [];

        // 2) Orders where this stage is completed but no later stage is active
        const { data: completedAtStage } = await supabase
          .from('order_progress')
          .select('order_id')
          .eq('stage_id', stageId)
          .eq('status', 'completed');

        const completedOrderIds = completedAtStage?.map((p) => p.order_id) || [];
        let stuckAtStageIds: string[] = [];

        if (completedOrderIds.length > 0) {
          const { data: laterStages } = await supabase
            .from('stages')
            .select('id')
            .gt('sort_order', selectedStage.sort_order);

          const laterStageIds = laterStages?.map((s) => s.id) || [];

          if (laterStageIds.length > 0) {
            const { data: progressedOrders } = await supabase
              .from('order_progress')
              .select('order_id')
              .in('order_id', completedOrderIds)
              .in('stage_id', laterStageIds)
              .in('status', ['in_progress', 'completed']);

            const progressedIds = new Set(progressedOrders?.map((p) => p.order_id) || []);
            stuckAtStageIds = completedOrderIds.filter((id) => !progressedIds.has(id));
          } else {
            stuckAtStageIds = completedOrderIds;
          }
        }

        const allMatchingIds = [...new Set([...inProgressIds, ...stuckAtStageIds])];

        if (allMatchingIds.length > 0) {
          query = query.in('id', allMatchingIds);
        } else {
          return NextResponse.json({
            success: true,
            orders: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          });
        }
      }
    }

    // Apply status filter
    if (status === 'delayed') {
      query = query.eq('is_delayed', true);
    } else if (status === 'active') {
      // Active = not yet delivered
      const { data: deliveredStage } = await supabase
        .from('stages')
        .select('id')
        .eq('name', 'delivered')
        .single();

      if (deliveredStage) {
        const { data: deliveredProgress } = await supabase
          .from('order_progress')
          .select('order_id')
          .eq('stage_id', deliveredStage.id)
          .eq('status', 'completed');

        const deliveredIds = deliveredProgress?.map((p) => p.order_id) || [];
        if (deliveredIds.length > 0) {
          query = query.not('id', 'in', `(${deliveredIds.join(',')})`);
        }
      }
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Map Supabase's `order_progress` join key to `progress` to match OrderWithProgress type
    const mappedOrders = (orders || []).map(({ order_progress, ...rest }: any) => ({
      ...rest,
      progress: order_progress || [],
    }));

    return NextResponse.json({
      success: true,
      orders: mappedOrders,
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

    // Validate field lengths
    const lengthChecks = [
      validateMaxLength(String(order_number), LIMITS.ORDER_NUMBER, 'order_number'),
      validateMaxLength(String(customer_name), LIMITS.CUSTOMER_NAME, 'customer_name'),
      validateMaxLength(String(customer_email), LIMITS.CUSTOMER_EMAIL, 'customer_email'),
      validateMaxLength(String(customer_phone), LIMITS.CUSTOMER_PHONE, 'customer_phone'),
      validateMaxLength(String(items_description), LIMITS.ITEMS_DESCRIPTION, 'items_description'),
    ].filter(Boolean);

    if (lengthChecks.length > 0) {
      return NextResponse.json(
        { success: false, error: lengthChecks[0] },
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
