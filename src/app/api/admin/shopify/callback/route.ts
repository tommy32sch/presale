import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

// Handle Shopify OAuth callback
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://presale-tracker.vercel.app';

  // Verify admin is authenticated (cookie present on Shopify redirect)
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.redirect(`${appUrl}/admin/login?error=auth_required`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const shop = searchParams.get('shop');

  const storedState = request.cookies.get('shopify_oauth_state')?.value;

  // Verify state to prevent CSRF
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/admin?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/admin?error=no_code`);
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!clientId || !clientSecret || !storeDomain) {
    return NextResponse.redirect(`${appUrl}/admin?error=not_configured`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${appUrl}/admin?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch shop name from Shopify
    let shopName: string | null = null;
    try {
      const shopRes = await fetch(`https://${storeDomain}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      });
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        shopName = shopData?.shop?.name || null;
      }
    } catch {
      // Non-critical — continue without shop name
    }

    // Store the access token in the database
    const supabase = db();

    // Upsert the Shopify connection
    const { error } = await supabase
      .from('shopify_connection')
      .upsert({
        id: 'default',
        store_domain: storeDomain,
        access_token: accessToken,
        shop_name: shopName,
        connected_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to store access token:', error);
      return NextResponse.redirect(`${appUrl}/admin?error=storage_failed`);
    }

    // Clear the state cookie and redirect to admin
    const response = NextResponse.redirect(`${appUrl}/admin?shopify=connected`);
    response.cookies.delete('shopify_oauth_state');

    return response;
  } catch (error) {
    console.error('Shopify OAuth error:', error);
    return NextResponse.redirect(`${appUrl}/admin?error=oauth_failed`);
  }
}
