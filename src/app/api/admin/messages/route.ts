import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const supabase = db();

    // Get distinct order IDs with unread messages
    let query = supabase
      .from('messages')
      .select(`
        *,
        order:orders(id, order_number, customer_name, customer_email)
      `)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Group messages by order
    const orderMap = new Map<string, {
      order: { id: string; order_number: string; customer_name: string; customer_email: string };
      messages: typeof messages;
      unreadCount: number;
      latestMessage: string;
    }>();

    for (const message of messages || []) {
      if (!message.order) continue;

      const orderId = message.order.id;
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          order: message.order,
          messages: [],
          unreadCount: 0,
          latestMessage: message.created_at,
        });
      }

      const entry = orderMap.get(orderId)!;
      entry.messages.push(message);
      if (!message.is_read) {
        entry.unreadCount++;
      }
    }

    const conversations = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.latestMessage).getTime() - new Date(a.latestMessage).getTime()
    );

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { order_id, content } = body;

    if (!order_id || !content) {
      return NextResponse.json(
        { success: false, error: 'Order ID and content are required' },
        { status: 400 }
      );
    }

    const supabase = db();

    // Insert reply
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        order_id,
        direction: 'outbound',
        content: content.trim(),
        is_read: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to send reply' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { order_id, mark_read } = body;

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const supabase = db();

    if (mark_read) {
      // Mark all inbound messages for this order as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('order_id', order_id)
        .eq('direction', 'inbound');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
