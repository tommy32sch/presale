import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { orderId } = await params;
    const supabase = db();

    // Fetch order with all related data
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_progress(
          *,
          stage:stages(*)
        ),
        notification_preferences(*),
        order_photos(
          photo:photos(*)
        ),
        messages(*)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Transform data to match frontend expectations
    const photos = order.order_photos?.map((op: { photo: object }) => op.photo) || [];
    const progress = order.order_progress || [];

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        progress,
        photos,
        order_progress: undefined,
        order_photos: undefined,
      },
    });
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { orderId } = await params;
    const body = await request.json();
    const supabase = db();

    // Extract allowed fields
    const allowedFields = [
      'carrier',
      'tracking_number',
      'is_delayed',
      'is_cancelled',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      console.error('Order update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { orderId } = await params;
    const supabase = db();

    // Delete order (cascades to order_progress, order_photos, notification_preferences, etc.)
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Order delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order delete error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
