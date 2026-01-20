import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const supabase = db();

    // Get total orders count (excluding cancelled)
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('is_cancelled', false);

    // Get delayed orders count
    const { count: delayedOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('is_delayed', true)
      .eq('is_cancelled', false);

    // Get active orders (not delivered yet)
    const { data: deliveredStage } = await supabase
      .from('stages')
      .select('id')
      .eq('name', 'delivered')
      .single();

    let activeOrders = 0;
    if (deliveredStage) {
      const { count } = await supabase
        .from('orders')
        .select('id, order_progress!inner(stage_id, status)', { count: 'exact', head: true })
        .eq('is_cancelled', false)
        .neq('order_progress.stage_id', deliveredStage.id)
        .or('status.neq.completed', { foreignTable: 'order_progress' });
      activeOrders = count || 0;
    }

    // Get pending notifications count
    const { count: pendingNotifications } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review');

    // Get unread messages count
    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('direction', 'inbound');

    // Get orders by stage
    const { data: stages } = await supabase
      .from('stages')
      .select('id, display_name')
      .order('sort_order');

    const ordersByStage: { stage: string; count: number }[] = [];

    if (stages) {
      for (const stage of stages) {
        const { count } = await supabase
          .from('order_progress')
          .select('*', { count: 'exact', head: true })
          .eq('stage_id', stage.id)
          .eq('status', 'in_progress');

        if (count && count > 0) {
          ordersByStage.push({
            stage: stage.display_name,
            count,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: totalOrders || 0,
        activeOrders: activeOrders || 0,
        delayedOrders: delayedOrders || 0,
        pendingNotifications: pendingNotifications || 0,
        unreadMessages: unreadMessages || 0,
        ordersByStage,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
