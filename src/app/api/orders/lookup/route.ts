import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';
import { normalizeOrderNumber } from '@/lib/utils/order';
import { checkRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { OrderWithProgress } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request.headers);
    const rateLimitResult = await checkRateLimit(`order-lookup:${clientIP}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait a minute and try again.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { orderNumber, phone } = body;

    // Validate inputs
    if (!orderNumber || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order number and phone number are required.',
        },
        { status: 400 }
      );
    }

    // Normalize inputs
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid phone number.',
        },
        { status: 400 }
      );
    }

    const supabase = db();

    // Look up order with both order number AND phone number
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', normalizedOrderNumber)
      .eq('customer_phone_normalized', normalizedPhone)
      .eq('is_cancelled', false)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Order not found. Please check your order number and phone number. Need help? Contact us.',
        },
        { status: 404 }
      );
    }

    // Fetch order progress with stages
    const { data: progress, error: progressError } = await supabase
      .from('order_progress')
      .select(`
        *,
        stage:stages(*)
      `)
      .eq('order_id', order.id)
      .order('stage_id', { ascending: true });

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error loading order details. Please try again.',
        },
        { status: 500 }
      );
    }

    // Fetch photos associated with this order
    const { data: orderPhotos } = await supabase
      .from('order_photos')
      .select('photo_id')
      .eq('order_id', order.id);

    let photos: any[] = [];
    if (orderPhotos && orderPhotos.length > 0) {
      const photoIds = orderPhotos.map((op) => op.photo_id);
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .in('id', photoIds)
        .order('uploaded_at', { ascending: false });

      photos = photosData || [];
    }

    // Fetch notification preferences
    const { data: notificationPrefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    // Build response - mask sensitive phone data
    const orderWithProgress: OrderWithProgress = {
      ...order,
      customer_phone: maskPhoneDisplay(order.customer_phone),
      customer_phone_normalized: '', // Don't expose normalized phone
      progress: progress || [],
      photos,
      notification_preferences: notificationPrefs || undefined,
    };

    return NextResponse.json({
      success: true,
      order: orderWithProgress,
    });
  } catch (error) {
    console.error('Order lookup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Mask phone for display: (555) 123-4567 -> (***) ***-4567
function maskPhoneDisplay(phone: string): string {
  // Keep last 4 digits
  const lastFour = phone.slice(-4);
  const prefix = phone.slice(0, -4).replace(/\d/g, '*');
  return prefix + lastFour;
}
