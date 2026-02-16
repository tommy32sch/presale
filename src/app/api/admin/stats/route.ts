import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

const STAGE_COLORS: Record<string, string> = {
  payment_received: 'bg-status-pending',
  sent_to_manufacturer: 'bg-status-info',
  materials_sourcing: 'bg-chart-3',
  production_started: 'bg-primary',
  quality_check: 'bg-chart-2',
  shipped: 'bg-status-warning',
  delivered: 'bg-status-success',
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const supabase = db();

    // Fetch app settings for production target
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('production_target_days')
      .eq('id', 'default')
      .single();

    const targetDays = appSettings?.production_target_days || 30;

    // Get all stages
    const { data: stages } = await supabase
      .from('stages')
      .select('id, name, display_name, sort_order')
      .order('sort_order');

    const deliveredStage = stages?.find((s) => s.name === 'delivered');
    const paymentStage = stages?.find((s) => s.name === 'payment_received');

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

    // Get delivered order IDs
    let deliveredIds: string[] = [];
    if (deliveredStage) {
      const { data: deliveredProgress } = await supabase
        .from('order_progress')
        .select('order_id')
        .eq('stage_id', deliveredStage.id)
        .eq('status', 'completed');
      deliveredIds = deliveredProgress?.map((p) => p.order_id) || [];
    }
    const deliveredSet = new Set(deliveredIds);

    // Get all non-cancelled orders
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('is_cancelled', false);

    const allOrderIds = allOrders?.map((o) => o.id) || [];
    const activeOrderIds = allOrderIds.filter((id) => !deliveredSet.has(id));
    const activeOrders = activeOrderIds.length;

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

    // --- Orders by stage (legacy: in_progress counts) ---
    const ordersByStage: { stage: string; count: number }[] = [];
    if (stages) {
      for (const stage of stages) {
        const { count } = await supabase
          .from('order_progress')
          .select('*', { count: 'exact', head: true })
          .eq('stage_id', stage.id)
          .eq('status', 'in_progress');

        if (count && count > 0) {
          ordersByStage.push({ stage: stage.display_name, count });
        }
      }
    }

    // --- Stage Distribution (current stage for each active order) ---
    const stageDistribution: {
      stageId: number;
      stageName: string;
      displayName: string;
      count: number;
      percentage: number;
      color: string;
    }[] = [];

    if (activeOrderIds.length > 0 && stages) {
      // Get all progress for active orders
      const { data: allProgress } = await supabase
        .from('order_progress')
        .select('order_id, stage_id, status')
        .in('order_id', activeOrderIds);

      // Build sort_order lookup
      const stageSort = new Map(stages.map((s) => [s.id, s.sort_order]));

      // Find current stage per order (highest sort_order that is in_progress or completed)
      const orderCurrentStage = new Map<string, number>();
      for (const p of allProgress || []) {
        if (p.status === 'not_started') continue;
        const sortOrder = stageSort.get(p.stage_id) || 0;
        const currentMax = stageSort.get(orderCurrentStage.get(p.order_id) || 0) || 0;
        if (sortOrder > currentMax) {
          orderCurrentStage.set(p.order_id, p.stage_id);
        }
      }

      // Count per stage
      const stageCounts = new Map<number, number>();
      for (const stageId of orderCurrentStage.values()) {
        stageCounts.set(stageId, (stageCounts.get(stageId) || 0) + 1);
      }

      // Orders with no progress at all
      const ordersWithNoProgress = activeOrderIds.length - orderCurrentStage.size;

      for (const stage of stages) {
        const count = stageCounts.get(stage.id) || 0;
        if (count > 0) {
          stageDistribution.push({
            stageId: stage.id,
            stageName: stage.name,
            displayName: stage.display_name,
            count,
            percentage: activeOrderIds.length > 0 ? Math.round((count / activeOrderIds.length) * 100) : 0,
            color: STAGE_COLORS[stage.name] || 'bg-muted',
          });
        }
      }

      // Add "Not Started" bucket if needed
      if (ordersWithNoProgress > 0) {
        stageDistribution.unshift({
          stageId: 0,
          stageName: 'not_started',
          displayName: 'Not Started',
          count: ordersWithNoProgress,
          percentage: Math.round((ordersWithNoProgress / activeOrderIds.length) * 100),
          color: 'bg-muted-foreground/30',
        });
      }
    }

    // --- Production Health ---
    let onTrack = 0;
    let atRisk = 0;
    let behind = 0;

    if (paymentStage && activeOrderIds.length > 0) {
      // Get payment_received completion times for active orders
      const { data: paymentProgress } = await supabase
        .from('order_progress')
        .select('order_id, completed_at')
        .eq('stage_id', paymentStage.id)
        .eq('status', 'completed')
        .in('order_id', activeOrderIds);

      const now = new Date();
      for (const record of paymentProgress || []) {
        if (!record.completed_at) continue;
        const paymentDate = new Date(record.completed_at);
        const elapsedMs = now.getTime() - paymentDate.getTime();
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const ratio = elapsedDays / targetDays;

        if (ratio <= 0.7) onTrack++;
        else if (ratio <= 1.0) atRisk++;
        else behind++;
      }
    }

    const totalTracked = onTrack + atRisk + behind;
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (totalTracked > 0) {
      const behindRatio = behind / totalTracked;
      if (behindRatio > 0.1) healthStatus = 'critical';
      else if (behind > 0) healthStatus = 'warning';
      else if (atRisk / totalTracked > 0.2) healthStatus = 'warning';
    }

    // --- Today's Status ---
    const todayStatus = {
      hasDelayedOrders: (delayedOrders || 0) > 0,
      delayedCount: delayedOrders || 0,
      message: (delayedOrders || 0) > 0
        ? `${delayedOrders} order${delayedOrders !== 1 ? 's' : ''} behind schedule`
        : 'All orders on schedule',
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: totalOrders || 0,
        activeOrders,
        delayedOrders: delayedOrders || 0,
        pendingNotifications: pendingNotifications || 0,
        unreadMessages: unreadMessages || 0,
        ordersByStage,
        stageDistribution,
        productionHealth: {
          targetDays,
          onTrack,
          atRisk,
          behind,
          totalActive: totalTracked,
          healthStatus,
        },
        todayStatus,
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
