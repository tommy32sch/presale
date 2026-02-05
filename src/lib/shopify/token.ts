import { db } from '@/lib/supabase/server';

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Refresh Shopify access token using client credentials grant
 */
export async function refreshShopifyToken(): Promise<TokenRefreshResult> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!storeDomain || !clientId || !clientSecret) {
    return {
      success: false,
      error: 'Missing Shopify configuration (SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET)',
    };
  }

  try {
    const response = await fetch(
      `https://${storeDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Shopify API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 86399; // Default ~24 hours

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      accessToken,
      expiresAt,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Verify a token works by making a test API call
 */
export async function verifyShopifyToken(accessToken: string): Promise<boolean> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!storeDomain) return false;

  try {
    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Update token in database
 */
export async function updateStoredToken(
  accessToken: string,
  expiresAt: Date
): Promise<{ success: boolean; error?: string }> {
  const supabase = db();
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!storeDomain) {
    return { success: false, error: 'Missing SHOPIFY_STORE_DOMAIN' };
  }

  const { error } = await supabase
    .from('shopify_connection')
    .upsert({
      id: 'default',
      store_domain: storeDomain,
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
      last_refresh_at: new Date().toISOString(),
      refresh_error: null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Record a refresh error without overwriting the existing token
 */
export async function recordRefreshError(error: string): Promise<void> {
  const supabase = db();

  await supabase
    .from('shopify_connection')
    .update({
      refresh_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default');
}
