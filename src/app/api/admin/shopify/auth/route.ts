import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

// Initiate Shopify OAuth flow
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://presale-tracker.vercel.app';

  if (!clientId || !storeDomain) {
    return NextResponse.json(
      { success: false, error: 'Shopify not configured' },
      { status: 500 }
    );
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie for verification
  const redirectUrl = `https://${storeDomain}/admin/oauth/authorize?` +
    `client_id=${clientId}&` +
    `scope=read_orders,read_customers&` +
    `redirect_uri=${encodeURIComponent(`${appUrl}/api/admin/shopify/callback`)}&` +
    `state=${state}`;

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
