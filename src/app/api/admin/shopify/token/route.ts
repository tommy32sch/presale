import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { setupShopifyWebhooks } from '@/lib/shopify/webhooks';

// Save manually entered access token
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { accessToken } = await request.json();

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    if (!storeDomain) {
      return NextResponse.json(
        { success: false, error: 'SHOPIFY_STORE_DOMAIN not configured' },
        { status: 500 }
      );
    }

    // Verify the token works by making a test API call
    const testResponse = await fetch(
      `https://${storeDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!testResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid access token - could not connect to Shopify' },
        { status: 400 }
      );
    }

    // Store the access token in the database
    const supabase = db();

    const { error } = await supabase
      .from('shopify_connection')
      .upsert({
        id: 'default',
        store_domain: storeDomain,
        access_token: accessToken,
        connected_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to store access token:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save token' },
        { status: 500 }
      );
    }

    // Setup webhooks for automatic order syncing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const webhookResult = await setupShopifyWebhooks(
        storeDomain,
        accessToken,
        appUrl
      );

      if (!webhookResult.success) {
        console.error('Failed to setup webhooks:', webhookResult.error);
        // Don't fail the connection, but log the error
        // Webhooks can be setup manually later
      }
    } else {
      console.warn('NEXT_PUBLIC_APP_URL not set, skipping webhook setup');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save token error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
