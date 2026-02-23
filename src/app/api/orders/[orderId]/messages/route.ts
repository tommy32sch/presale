import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { checkRateLimit, checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { isValidUUID } from '@/lib/utils/validation';

// Customer sends a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Rate limit
    const clientIP = getClientIP(request.headers);
    const rateLimitResult = await checkRateLimit(`message:${clientIP}`);

    if (!rateLimitResult.success) {
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
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }

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

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        order_id: orderId,
        direction: 'inbound',
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Message insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Message error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get messages for an order (customer view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const clientIP = getClientIP(request.headers);
    const rateLimit = await checkConfiguredRateLimit(`message-read:${clientIP}`, 'message-read', 30, '1 m');
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

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
