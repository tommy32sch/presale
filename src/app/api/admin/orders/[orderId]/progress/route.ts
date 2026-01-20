import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { StageStatus } from '@/types';

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
    const {
      stage_id,
      status,
      estimated_start_date,
      estimated_end_date,
      admin_notes,
      queue_notification,
    } = body;

    if (!stage_id || !status) {
      return NextResponse.json(
        { success: false, error: 'stage_id and status are required' },
        { status: 400 }
      );
    }

    const supabase = db();

    // Get existing progress record
    const { data: existingProgress } = await supabase
      .from('order_progress')
      .select('*')
      .eq('order_id', orderId)
      .eq('stage_id', stage_id)
      .single();

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status,
      estimated_start_date: estimated_start_date || null,
      estimated_end_date: estimated_end_date || null,
      admin_notes: admin_notes || null,
    };

    // Set timestamps based on status change
    if (status === 'in_progress' && existingProgress?.status !== 'in_progress') {
      updateData.started_at = now;
    }
    if (status === 'completed' && existingProgress?.status !== 'completed') {
      updateData.completed_at = now;
      if (!existingProgress?.started_at) {
        updateData.started_at = now;
      }
    }

    // Don't allow changing completed_at once set (immutable)
    if (existingProgress?.completed_at && status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot change status of a completed stage' },
        { status: 400 }
      );
    }

    // Upsert progress
    const { error: progressError } = await supabase
      .from('order_progress')
      .upsert({
        id: existingProgress?.id || crypto.randomUUID(),
        order_id: orderId,
        stage_id,
        ...updateData,
      });

    if (progressError) {
      console.error('Progress update error:', progressError);
      return NextResponse.json(
        { success: false, error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // Queue notification if requested and status changed
    if (queue_notification && status !== existingProgress?.status) {
      await queueNotification(supabase, orderId, stage_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function queueNotification(
  supabase: ReturnType<typeof db>,
  orderId: string,
  stageId: number
) {
  try {
    // Get order and stage details
    const { data: order } = await supabase
      .from('orders')
      .select('*, notification_preferences(*)')
      .eq('id', orderId)
      .single();

    const { data: stage } = await supabase
      .from('stages')
      .select('*')
      .eq('id', stageId)
      .single();

    if (!order || !stage) return;

    const prefs = order.notification_preferences;
    if (!prefs) return;

    const batchId = crypto.randomUUID();
    const notifications = [];

    // Create personalized message
    const messageBody = `Hi ${order.customer_name.split(' ')[0]}, great news! Your order ${order.order_number} has moved to: ${stage.display_name}. ${stage.description}`;

    // Queue SMS if enabled
    if (prefs.sms_enabled) {
      notifications.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        stage_id: stageId,
        channel: 'sms',
        recipient: order.customer_phone_normalized,
        message_body: messageBody,
        status: 'pending_review',
        batch_id: batchId,
      });
    }

    // Queue email if enabled
    if (prefs.email_enabled) {
      notifications.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        stage_id: stageId,
        channel: 'email',
        recipient: order.customer_email,
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
