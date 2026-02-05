import { NextRequest, NextResponse } from 'next/server';
import {
  refreshShopifyToken,
  verifyShopifyToken,
  updateStoredToken,
  recordRefreshError,
} from '@/lib/shopify/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Shopify Token Refresh] CRON_SECRET not configured');
    return NextResponse.json(
      { success: false, error: 'Cron not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Shopify Token Refresh] Unauthorized request');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Shopify Token Refresh] Starting token refresh...');

  // Step 1: Request new token
  const refreshResult = await refreshShopifyToken();

  if (!refreshResult.success || !refreshResult.accessToken) {
    console.error('[Shopify Token Refresh] Failed:', refreshResult.error);
    await recordRefreshError(refreshResult.error || 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: refreshResult.error,
        message: 'Token refresh failed - existing token preserved',
      },
      { status: 500 }
    );
  }

  // Step 2: Verify the new token works
  const isValid = await verifyShopifyToken(refreshResult.accessToken);

  if (!isValid) {
    const error = 'New token failed verification';
    console.error('[Shopify Token Refresh]', error);
    await recordRefreshError(error);
    return NextResponse.json(
      {
        success: false,
        error,
        message: 'Token verification failed - existing token preserved',
      },
      { status: 500 }
    );
  }

  // Step 3: Update the token in the database
  const updateResult = await updateStoredToken(
    refreshResult.accessToken,
    refreshResult.expiresAt!
  );

  if (!updateResult.success) {
    console.error('[Shopify Token Refresh] Failed to store:', updateResult.error);
    await recordRefreshError(updateResult.error || 'Database update failed');
    return NextResponse.json(
      {
        success: false,
        error: updateResult.error,
        message: 'Failed to store token - existing token preserved',
      },
      { status: 500 }
    );
  }

  console.log('[Shopify Token Refresh] Success. Expires:', refreshResult.expiresAt);

  return NextResponse.json({
    success: true,
    message: 'Token refreshed successfully',
    expiresAt: refreshResult.expiresAt?.toISOString(),
  });
}
