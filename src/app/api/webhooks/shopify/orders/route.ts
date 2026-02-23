import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';
import crypto from 'crypto';

interface ShopifyWebhookOrder {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  line_items: Array<{
    title: string;
    quantity: number;
  }>;
}

// Verify Shopify webhook signature
function verifyWebhook(body: string, hmacHeader: string): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('SHOPIFY_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(body, 'utf8')
    .digest('base64');

  const hashBuffer = Buffer.from(hash, 'utf8');
  const hmacBuffer = Buffer.from(hmacHeader, 'utf8');

  if (hashBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, hmacBuffer);
}

// Handle Shopify order webhooks
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for HMAC verification
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');

    if (!hmacHeader) {
      console.error('Missing HMAC header');
      return NextResponse.json(
        { success: false, error: 'Missing HMAC header' },
        { status: 401 }
      );
    }

    // Verify webhook authenticity
    if (!verifyWebhook(body, hmacHeader)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const shopifyOrder: ShopifyWebhookOrder = JSON.parse(body);
    const supabase = db();

    const orderNumber = shopifyOrder.name;

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .single();

    // Skip if order already exists
    if (existingOrder) {
      console.log(`Order ${orderNumber} already exists, skipping`);
      return NextResponse.json({ success: true, skipped: true });
    }

    // Get customer info
    const customerName = shopifyOrder.customer
      ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim()
      : 'Unknown Customer';
    const customerEmail = shopifyOrder.customer?.email || shopifyOrder.email || '';
    const customerPhone = shopifyOrder.customer?.phone || shopifyOrder.phone || '';

    // Skip if no phone (required for lookup)
    if (!customerPhone) {
      console.log(`Order ${orderNumber} has no phone number, skipping`);
      return NextResponse.json({ success: true, skipped: true });
    }

    // Build items description
    const itemsDescription = shopifyOrder.line_items
      .map((item) => `${item.title}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`)
      .join(', ');

    const totalQuantity = shopifyOrder.line_items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Insert order
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_phone_normalized: normalizePhone(customerPhone),
        items_description: itemsDescription,
        quantity: totalQuantity,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert order:', orderNumber, insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Initialize progress for all stages
    const { data: stages } = await supabase
      .from('stages')
      .select('id')
      .order('sort_order');

    if (stages && stages.length > 0 && newOrder) {
      const progressRecords = stages.map((stage) => ({
        order_id: newOrder.id,
        stage_id: stage.id,
        status: 'not_started',
      }));

      await supabase.from('order_progress').insert(progressRecords);
    }

    console.log(`Successfully created order ${orderNumber} from webhook`);

    return NextResponse.json({
      success: true,
      order_id: newOrder.id,
      order_number: orderNumber,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
