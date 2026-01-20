import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseOrdersCSV, parseStageUpdatesCSV } from '@/lib/csv/parser';
import { normalizePhone } from '@/lib/utils/phone';
import { CSVImportResult } from '@/types';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'orders' or 'stages'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();

    if (type === 'stages') {
      return handleStageUpdates(csvContent);
    } else {
      return handleOrdersUpload(csvContent);
    }
  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function handleOrdersUpload(csvContent: string): Promise<NextResponse> {
  const parseResult = parseOrdersCSV(csvContent);

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'CSV parsing failed',
      details: parseResult.errors,
    }, { status: 400 });
  }

  const supabase = db();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [...parseResult.errors];

  // Get all stages for initializing progress
  const { data: stages } = await supabase
    .from('stages')
    .select('id')
    .order('sort_order');

  for (const row of parseResult.data) {
    try {
      // Check if order already exists
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', row.order_number)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      const normalizedPhone = normalizePhone(row.customer_phone);
      if (!normalizedPhone) {
        errors.push(`Order ${row.order_number}: Invalid phone number`);
        continue;
      }

      // Insert order
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_number: row.order_number,
          customer_name: row.customer_name,
          customer_email: row.customer_email,
          customer_phone: row.customer_phone,
          customer_phone_normalized: normalizedPhone,
          items_description: row.items_description,
          quantity: parseInt(row.quantity || '1'),
        })
        .select()
        .single();

      if (insertError) {
        errors.push(`Order ${row.order_number}: ${insertError.message}`);
        continue;
      }

      // Initialize progress for all stages
      if (stages && newOrder) {
        const progressRecords = stages.map((stage, index) => ({
          order_id: newOrder.id,
          stage_id: stage.id,
          status: index === 0 ? 'completed' : 'not_started', // First stage (Payment Received) is complete
          completed_at: index === 0 ? new Date().toISOString() : null,
        }));

        await supabase.from('order_progress').insert(progressRecords);
      }

      imported++;
    } catch (err) {
      errors.push(`Order ${row.order_number}: Unexpected error`);
    }
  }

  const result: CSVImportResult = {
    success: true,
    imported,
    skipped,
    errors,
  };

  return NextResponse.json(result);
}

async function handleStageUpdates(csvContent: string): Promise<NextResponse> {
  const parseResult = parseStageUpdatesCSV(csvContent);

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'CSV parsing failed',
      details: parseResult.errors,
    }, { status: 400 });
  }

  const supabase = db();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [...parseResult.errors];

  // Get stages mapping
  const { data: stages } = await supabase.from('stages').select('id, name');
  const stageMap = new Map(stages?.map((s) => [s.name, s.id]) || []);

  for (const row of parseResult.data) {
    try {
      // Find order
      const { data: order } = await supabase
        .from('orders')
        .select('id, customer_name, customer_email, customer_phone_normalized')
        .eq('order_number', row.order_number)
        .single();

      if (!order) {
        errors.push(`Order ${row.order_number}: Not found`);
        continue;
      }

      const stageId = stageMap.get(row.stage);
      if (!stageId) {
        errors.push(`Order ${row.order_number}: Invalid stage ${row.stage}`);
        continue;
      }

      // Get current progress
      const { data: currentProgress } = await supabase
        .from('order_progress')
        .select('*')
        .eq('order_id', order.id)
        .eq('stage_id', stageId)
        .single();

      // Skip if no change
      if (currentProgress && currentProgress.status === row.status) {
        skipped++;
        continue;
      }

      // Don't allow changing completed stages
      if (currentProgress?.completed_at && row.status !== 'completed') {
        skipped++;
        continue;
      }

      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        status: row.status,
        estimated_start_date: row.estimated_start_date || null,
        estimated_end_date: row.estimated_end_date || null,
        admin_notes: row.notes || null,
      };

      if (row.status === 'in_progress' && currentProgress?.status !== 'in_progress') {
        updateData.started_at = now;
      }
      if (row.status === 'completed' && currentProgress?.status !== 'completed') {
        updateData.completed_at = now;
        if (!currentProgress?.started_at) {
          updateData.started_at = now;
        }
      }

      // Upsert progress
      await supabase.from('order_progress').upsert({
        id: currentProgress?.id || crypto.randomUUID(),
        order_id: order.id,
        stage_id: stageId,
        ...updateData,
      });

      // Queue notification if opted in
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('order_id', order.id)
        .single();

      if (prefs && (prefs.sms_enabled || prefs.email_enabled)) {
        const { data: stage } = await supabase
          .from('stages')
          .select('display_name, description')
          .eq('id', stageId)
          .single();

        if (stage) {
          const batchId = crypto.randomUUID();
          const messageBody = `Hi ${order.customer_name.split(' ')[0]}, your order ${row.order_number} has moved to: ${stage.display_name}. ${stage.description}`;

          const notifications = [];
          if (prefs.sms_enabled) {
            notifications.push({
              order_id: order.id,
              stage_id: stageId,
              channel: 'sms',
              recipient: order.customer_phone_normalized,
              message_body: messageBody,
              status: 'pending_review',
              batch_id: batchId,
            });
          }
          if (prefs.email_enabled) {
            notifications.push({
              order_id: order.id,
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
        }
      }

      imported++;
    } catch (err) {
      errors.push(`Order ${row.order_number}: Unexpected error`);
    }
  }

  const result: CSVImportResult = {
    success: true,
    imported,
    skipped,
    errors,
  };

  return NextResponse.json(result);
}
