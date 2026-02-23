import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { isValidUUID } from '@/lib/utils/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const clientIP = getClientIP(request.headers);
    const rateLimit = await checkConfiguredRateLimit(`notif-prefs:${clientIP}`, 'notif-prefs', 20, '1 m');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait and try again.' },
        { status: 429 }
      );
    }

    const { orderId } = await params;
    if (!isValidUUID(orderId)) {
      return NextResponse.json({ success: false, error: 'Invalid order ID format' }, { status: 400 });
    }
    const body = await request.json();
    const { sms_enabled, email_enabled } = body;

    const supabase = db();

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Upsert notification preferences
    const { error: upsertError } = await supabase
      .from('notification_preferences')
      .upsert({
        order_id: orderId,
        sms_enabled: sms_enabled || false,
        email_enabled: email_enabled || false,
        opted_in_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('Error saving preferences:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const clientIP = getClientIP(request.headers);
    const rateLimit = await checkConfiguredRateLimit(`notif-prefs:${clientIP}`, 'notif-prefs', 20, '1 m');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait and try again.' },
        { status: 429 }
      );
    }

    const { orderId } = await params;
    if (!isValidUUID(orderId)) {
      return NextResponse.json({ success: false, error: 'Invalid order ID format' }, { status: 400 });
    }
    const supabase = db();

    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      return NextResponse.json({
        success: true,
        preferences: null,
      });
    }

    return NextResponse.json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
