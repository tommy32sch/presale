import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { ActivityEvent } from '@/types';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const clientIP = getClientIP(request.headers);
  const rateLimit = await checkConfiguredRateLimit(`admin-activity:${clientIP}`, 'admin-activity', 60, '1 m');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const supabase = db();

    // 1. Stage started events
    const { data: startedEvents } = await supabase
      .from('order_progress')
      .select('id, order_id, started_at, completed_at, orders(order_number, customer_name), stage:stages(display_name)')
      .not('started_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10);

    // 2. Stage completed events
    const { data: completedEvents } = await supabase
      .from('order_progress')
      .select('id, order_id, completed_at, started_at, orders(order_number, customer_name), stage:stages(display_name)')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);

    // 3. New orders
    const { data: newOrders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, created_at')
      .eq('is_cancelled', false)
      .order('created_at', { ascending: false })
      .limit(10);

    const activities: ActivityEvent[] = [];

    // Transform started events (skip instant completions where started_at === completed_at)
    if (startedEvents) {
      for (const e of startedEvents) {
        if (e.started_at === e.completed_at) continue;
        const order = e.orders as unknown as { order_number: string; customer_name: string } | null;
        const stage = e.stage as unknown as { display_name: string } | null;
        if (!order || !stage) continue;
        activities.push({
          id: `progress-${e.id}-started`,
          type: 'stage_started',
          orderId: e.order_id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          stageName: stage.display_name,
          timestamp: e.started_at!,
        });
      }
    }

    // Transform completed events
    if (completedEvents) {
      for (const e of completedEvents) {
        const order = e.orders as unknown as { order_number: string; customer_name: string } | null;
        const stage = e.stage as unknown as { display_name: string } | null;
        if (!order || !stage) continue;
        activities.push({
          id: `progress-${e.id}-completed`,
          type: 'stage_completed',
          orderId: e.order_id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          stageName: stage.display_name,
          timestamp: e.completed_at!,
        });
      }
    }

    // Transform new orders
    if (newOrders) {
      for (const o of newOrders) {
        activities.push({
          id: `order-${o.id}-created`,
          type: 'order_created',
          orderId: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          timestamp: o.created_at,
        });
      }
    }

    // Sort by timestamp DESC and take top 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      activities: activities.slice(0, 10),
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
