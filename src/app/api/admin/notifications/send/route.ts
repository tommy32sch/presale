import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { sendSMS } from '@/lib/notifications/sms';
import { sendEmail } from '@/lib/notifications/email';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const clientIP = getClientIP(request.headers);
  const rateLimit = await checkConfiguredRateLimit(`admin-notif-send:${clientIP}`, 'admin-notif-send', 10, '1 m');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { ids } = body; // Array of notification IDs to send

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No notification IDs provided' },
        { status: 400 }
      );
    }

    const supabase = db();

    // Fetch notifications to send
    const { data: notifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        order:orders(order_number, customer_name)
      `)
      .in('id', ids)
      .in('status', ['pending_review', 'approved']);

    if (fetchError || !notifications) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const notification of notifications) {
      let result: { success: boolean; error?: string };

      if (notification.channel === 'sms') {
        result = await sendSMS(notification.recipient, notification.message_body);
      } else if (notification.channel === 'email') {
        const orderNum = notification.order?.order_number || 'your order';
        result = await sendEmail(
          notification.recipient,
          `Order Update: ${orderNum}`,
          notification.message_body
        );
      } else {
        result = { success: false, error: 'Unknown channel' };
      }

      if (result.success) {
        // Update status to sent
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
        sent++;
      } else {
        // Update status to failed with error
        await supabase
          .from('notification_queue')
          .update({
            status: 'failed',
            error_message: result.error,
          })
          .eq('id', notification.id);
        failed++;
        errors.push(`${notification.order?.order_number || 'Unknown'} (${notification.channel}): ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors,
    });
  } catch (error) {
    console.error('Send notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
