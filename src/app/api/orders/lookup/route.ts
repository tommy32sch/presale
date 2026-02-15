import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';
import { normalizeEmail } from '@/lib/utils/email';
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
    const { orderNumber, phone, email, lookupType } = body;

    // Validate inputs
    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order number is required.',
        },
        { status: 400 }
      );
    }

    // Must have either phone or email based on lookupType
    if (lookupType === 'email') {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email address is required.',
          },
          { status: 400 }
        );
      }
    } else {
      // Default to phone lookup for backwards compatibility
      if (!phone) {
        return NextResponse.json(
          {
            success: false,
            error: 'Phone number is required.',
          },
          { status: 400 }
        );
      }
    }

    // Normalize inputs
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
    const supabase = db();

    let order;
    let orderError;

    if (lookupType === 'email') {
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please enter a valid email address.',
          },
          { status: 400 }
        );
      }

      // Look up order with order number AND email
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', normalizedOrderNumber)
        .eq('customer_email_normalized', normalizedEmail)
        .eq('is_cancelled', false)
        .single();

      order = result.data;
      orderError = result.error;
    } else {
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

      // Look up order with order number AND phone number
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', normalizedOrderNumber)
        .eq('customer_phone_normalized', normalizedPhone)
        .eq('is_cancelled', false)
        .single();

      order = result.data;
      orderError = result.error;
    }

    if (orderError || !order) {
      const lookupField = lookupType === 'email' ? 'email address' : 'phone number';
      return NextResponse.json(
        {
          success: false,
          error: `Order not found. Please check your order number and ${lookupField}. Need help? Contact us.`,
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

    // Build response - mask sensitive data
    const orderWithProgress: OrderWithProgress = {
      ...order,
      customer_phone: order.customer_phone ? maskPhoneDisplay(order.customer_phone) : '',
      customer_phone_normalized: '', // Don't expose normalized phone
      customer_email: order.customer_email ? maskEmailDisplay(order.customer_email) : '',
      customer_email_normalized: '', // Don't expose normalized email
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

// Mask email for display: john.doe@gmail.com -> j***e@gmail.com
function maskEmailDisplay(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain || localPart.length < 2) {
    return email;
  }
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  return `${firstChar}${'*'.repeat(Math.min(localPart.length - 2, 5))}${lastChar}@${domain}`;
}
