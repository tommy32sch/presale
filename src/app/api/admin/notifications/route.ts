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
    const status = searchParams.get('status') || 'pending_review';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = db();

    let query = supabase
      .from('notification_queue')
      .select(`
        *,
        order:orders(order_number, customer_name),
        stage:stages(display_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { id, message_body, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const supabase = db();

    const updateData: Record<string, unknown> = {};
    if (message_body !== undefined) {
      updateData.message_body = message_body;
    }
    if (status) {
      updateData.status = status;
      if (status === 'approved') {
        updateData.reviewed_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('notification_queue')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const supabase = db();

    const { error } = await supabase
      .from('notification_queue')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
