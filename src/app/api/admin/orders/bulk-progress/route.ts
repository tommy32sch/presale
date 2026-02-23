import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { StageStatus } from '@/types';
import { validateEnum, LIMITS } from '@/lib/utils/validation';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

interface BulkProgressRequest {
  orderIds: string[];
  stage_id: number;
  status: StageStatus;
  queue_notification?: boolean;
}

interface BulkError {
  orderId: string;
  orderNumber: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const clientIP = getClientIP(request.headers);
  const rateLimit = await checkConfiguredRateLimit(`admin-bulk-progress:${clientIP}`, 'admin-bulk-progress', 20, '1 m');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body: BulkProgressRequest = await request.json();
    const { orderIds, stage_id, status, queue_notification } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'orderIds array is required' },
        { status: 400 }
      );
    }

    if (!stage_id || !status) {
      return NextResponse.json(
        { success: false, error: 'stage_id and status are required' },
        { status: 400 }
      );
    }

    if (orderIds.length > LIMITS.BULK_OPERATION_MAX) {
      return NextResponse.json(
        { success: false, error: `Maximum ${LIMITS.BULK_OPERATION_MAX} orders per bulk operation` },
        { status: 400 }
      );
    }

    const statusError = validateEnum(status, ['not_started', 'in_progress', 'completed'] as const, 'status');
    if (statusError) {
      return NextResponse.json({ success: false, error: statusError }, { status: 400 });
    }

    const supabase = db();

    // Verify stage exists
    const { data: stage, error: stageError } = await supabase
      .from('stages')
      .select('*')
      .eq('id', stage_id)
      .single();

    if (stageError || !stage) {
      return NextResponse.json(
        { success: false, error: 'Invalid stage_id' },
        { status: 400 }
      );
    }

    // Get all orders with their current progress for this stage
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, notification_preferences(*)')
      .in('id', orderIds);

    if (ordersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Get existing progress records for these orders and this stage
    const { data: existingProgress } = await supabase
      .from('order_progress')
      .select('*')
      .in('order_id', orderIds)
      .eq('stage_id', stage_id);

    const progressByOrderId = new Map(
      existingProgress?.map((p) => [p.order_id, p]) || []
    );

    let updated = 0;
    let skipped = 0;
    const errors: BulkError[] = [];
    const now = new Date().toISOString();
    const batchId = crypto.randomUUID();

    for (const order of orders || []) {
      const existing = progressByOrderId.get(order.id);

      // Skip if stage is already completed
      if (existing?.completed_at) {
        skipped++;
        errors.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: 'Stage already completed',
        });
        continue;
      }

      const updateData: Record<string, unknown> = { status };

      // Set timestamps based on status change
      if (status === 'in_progress' && existing?.status !== 'in_progress') {
        updateData.started_at = now;
      }
      if (status === 'completed' && existing?.status !== 'completed') {
        updateData.completed_at = now;
        if (!existing?.started_at) {
          updateData.started_at = now;
        }
      }

      // Upsert progress
      const { error: upsertError } = await supabase
        .from('order_progress')
        .upsert({
          id: existing?.id || crypto.randomUUID(),
          order_id: order.id,
          stage_id,
          ...updateData,
        });

      if (upsertError) {
        skipped++;
        errors.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: 'Database error',
        });
        continue;
      }

      // Auto-complete all prior stages
      if (status === 'in_progress' || status === 'completed') {
        const { data: priorStages } = await supabase
          .from('stages')
          .select('id')
          .lt('sort_order', stage.sort_order);

        if (priorStages && priorStages.length > 0) {
          const priorStageIds = priorStages.map((s) => s.id);

          const { data: priorProgress } = await supabase
            .from('order_progress')
            .select('id, started_at')
            .eq('order_id', order.id)
            .in('stage_id', priorStageIds)
            .neq('status', 'completed');

          if (priorProgress && priorProgress.length > 0) {
            for (const prior of priorProgress) {
              await supabase
                .from('order_progress')
                .update({
                  status: 'completed',
                  started_at: prior.started_at || now,
                  completed_at: now,
                })
                .eq('id', prior.id);
            }
          }
        }
      }

      // Queue notification if requested and status actually changed
      if (queue_notification && status !== existing?.status) {
        await queueNotification(supabase, order, stage, batchId);
      }

      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk progress update error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function queueNotification(
  supabase: ReturnType<typeof db>,
  order: { id: string; order_number: string; notification_preferences: unknown },
  stage: { id: number; display_name: string; description: string },
  batchId: string
) {
  try {
    // Get full order details for notification
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('customer_name, customer_email, customer_phone_normalized')
      .eq('id', order.id)
      .single();

    if (!fullOrder) return;

    const prefs = order.notification_preferences as {
      sms_enabled?: boolean;
      email_enabled?: boolean;
    } | null;
    if (!prefs) return;

    const notifications = [];
    const messageBody = `Hi ${fullOrder.customer_name.split(' ')[0]}, great news! Your order ${order.order_number} has moved to: ${stage.display_name}. ${stage.description}`;

    if (prefs.sms_enabled) {
      notifications.push({
        id: crypto.randomUUID(),
        order_id: order.id,
        stage_id: stage.id,
        channel: 'sms',
        recipient: fullOrder.customer_phone_normalized,
        message_body: messageBody,
        status: 'pending_review',
        batch_id: batchId,
      });
    }

    if (prefs.email_enabled) {
      notifications.push({
        id: crypto.randomUUID(),
        order_id: order.id,
        stage_id: stage.id,
        channel: 'email',
        recipient: fullOrder.customer_email,
        message_body: messageBody,
        status: 'pending_review',
        batch_id: batchId,
      });
    }

    if (notifications.length > 0) {
      await supabase.from('notification_queue').insert(notifications);
    }
  } catch (error) {
    console.error('Error queuing notification:', error);
  }
}
