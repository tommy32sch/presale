import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { normalizePhone } from '@/lib/utils/phone';

interface ShopifyOrder {
  id: number;
  name: string; // Order number like "#1001"
  email: string;
  phone: string;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping_address?: {
    phone?: string;
  };
  billing_address?: {
    phone?: string;
  };
  line_items: Array<{
    title: string;
    quantity: number;
  }>;
}

// Sync orders from Shopify
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const supabase = db();
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

    // Get access token - prefer database (refreshed daily) over env variable (static)
    let accessToken: string | null = null;

    // First try database (contains refreshed tokens from cron job)
    const { data: connection } = await supabase
      .from('shopify_connection')
      .select('access_token, expires_at')
      .eq('id', 'default')
      .single();

    if (connection?.access_token) {
      // Check if token is expired
      const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();

      if (!isExpired) {
        accessToken = connection.access_token;
      } else {
        console.log('Database token expired, will try env variable');
      }
    }

    // Fallback to env variable if no valid database token
    if (!accessToken) {
      accessToken = process.env.SHOPIFY_ACCESS_TOKEN || null;
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Shopify not connected. Please connect your store first.' },
        { status: 400 }
      );
    }

    // Fetch orders from Shopify
    const ordersResponse = await fetch(
      `https://${storeDomain}/admin/api/2024-01/orders.json?status=any&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken!,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Shopify API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch orders from Shopify' },
        { status: 500 }
      );
    }

    const { orders } = await ordersResponse.json() as { orders: ShopifyOrder[] };

    // Get existing order numbers to avoid duplicates
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('order_number');

    const existingOrderNumbers = new Set(
      existingOrders?.map((o) => o.order_number) || []
    );

    // Get all stages for initializing progress
    const { data: stages } = await supabase
      .from('stages')
      .select('id')
      .order('sort_order');

    let imported = 0;
    let skipped = 0;

    for (const shopifyOrder of orders) {
      const orderNumber = shopifyOrder.name; // e.g., "#1001"

      // Skip if already exists
      if (existingOrderNumbers.has(orderNumber)) {
        skipped++;
        continue;
      }

      // Get customer info
      const customerName = shopifyOrder.customer
        ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim()
        : 'Unknown Customer';
      const customerEmail = shopifyOrder.customer?.email || shopifyOrder.email || '';
      const customerPhone =
        shopifyOrder.customer?.phone ||
        shopifyOrder.phone ||
        shopifyOrder.shipping_address?.phone ||
        shopifyOrder.billing_address?.phone ||
        '';

      // Skip if no phone (required for lookup)
      if (!customerPhone) {
        skipped++;
        continue;
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
        skipped++;
        continue;
      }

      // Initialize progress for all stages
      if (stages && stages.length > 0 && newOrder) {
        const progressRecords = stages.map((stage) => ({
          order_id: newOrder.id,
          stage_id: stage.id,
          status: 'not_started',
        }));

        await supabase.from('order_progress').insert(progressRecords);
      }

      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: orders.length,
    });
  } catch (error) {
    console.error('Shopify sync error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Check Shopify connection status
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    // Check env variables first
    if (storeDomain && accessToken) {
      return NextResponse.json({
        success: true,
        connected: true,
        store_domain: storeDomain,
        connected_at: null,
      });
    }

    // Fallback to database
    const supabase = db();

    const { data: connection, error } = await supabase
      .from('shopify_connection')
      .select('store_domain, connected_at')
      .eq('id', 'default')
      .single();

    if (error || !connection) {
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      store_domain: connection.store_domain,
      connected_at: connection.connected_at,
    });
  } catch (error) {
    console.error('Connection check error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
