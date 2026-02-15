# Shopify Integration Setup Guide

This guide documents the complete process of setting up automatic order syncing from Shopify, including lessons learned and troubleshooting tips.

## Important: Shopify UI Changes (January 2026)

Shopify updated their admin interface in January 2026. The traditional method of creating custom apps and clicking "Reveal token once" may not work as expected. This guide documents the **client_credentials method** which works reliably.

## Prerequisites

- A Shopify store with admin access
- Your app deployed to a publicly accessible URL (e.g., Vercel)
- Node.js and npm installed locally

## Your Store Information

When setting up, you'll need:
- **Store Domain**: Your internal Shopify domain (e.g., `978sp6-1n.myshopify.com`)
  - This is NOT your custom domain (like `ivoryson.com`)
  - Find it in your Shopify admin URL: `admin.shopify.com/store/[store-id]`
- **Client ID**: Found in your Shopify app settings
- **Client Secret**: Found in your Shopify app settings (starts with `shpss_`)

## Step 1: Create a Shopify App

1. Go to **Settings** > **Apps and sales channels** > **Develop apps**
2. Click **Create an app**
3. Name it (e.g., "Presale Order Tracker")
4. Go to **Configure Admin API scopes** and enable:
   - `read_orders`
   - `read_customers`
5. Click **Save**
6. Note down your **Client ID** and **Client Secret** from the app settings

## Step 2: Get Access Token Using Client Credentials

Since the Shopify UI changed, the most reliable way to get an access token is via the OAuth client_credentials grant:

```bash
curl -X POST "https://YOUR-STORE-ID.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

**Example:**
```bash
curl -X POST "https://978sp6-1n.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

**Response:**
```json
{
  "access_token": "shpat_xxxxxxxxxxxxxxxxxxxxx",
  "scope": "read_customers,read_orders",
  "expires_in": 86399
}
```

**Important Notes:**
- The token expires in ~24 hours (86399 seconds)
- You'll need to refresh the token periodically for long-term use
- The token format is `shpat_` followed by a hex string

## Step 3: Configure Environment Variables

### Local (.env.local)

```env
# Shopify Integration
SHOPIFY_STORE_DOMAIN=978sp6-1n.myshopify.com
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=shpss_your_client_secret
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# App URL (required for webhooks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Vercel Environment Variables

Set the same variables in Vercel:
```bash
npx vercel env add SHOPIFY_STORE_DOMAIN production <<< "978sp6-1n.myshopify.com"
npx vercel env add SHOPIFY_ACCESS_TOKEN production <<< "shpat_xxxxx"
```

**Verify your Vercel environment:**
```bash
npx vercel env ls
npx vercel env pull .env.vercel  # Download to check values
```

## Step 4: Register Webhook

Register the webhook to receive order creation events:

```bash
curl -X POST "https://YOUR-STORE-ID.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: shpat_YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://your-app.vercel.app/api/webhooks/shopify/orders",
      "format": "json"
    }
  }'
```

**Verify webhook registration:**
```bash
curl -X GET "https://YOUR-STORE-ID.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: shpat_YOUR_ACCESS_TOKEN"
```

## Step 5: Deploy and Test

1. Deploy to Vercel: `npx vercel --prod`
2. Test manual sync:
   ```bash
   # Login first
   curl -c cookies.txt -X POST https://your-app.vercel.app/api/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your@email.com","password":"yourpassword"}'

   # Sync orders
   curl -b cookies.txt -X POST https://your-app.vercel.app/api/admin/shopify/sync
   ```

3. Create a test order in Shopify with a **phone number** (required!)

## Lessons Learned

### 1. Store Domain vs Custom Domain
- Your store has an internal Shopify domain: `xxx-xx.myshopify.com`
- This is different from your custom domain (e.g., `ivoryson.com`)
- Find your store ID in the admin URL: `admin.shopify.com/store/[THIS-PART]`

### 2. UI Changed - Use Client Credentials
- The old "Reveal token once" flow may not work consistently
- Use the `client_credentials` POST request method instead
- This is documented by Shopify but not prominent in the UI

### 3. Token Expiration
- Client credentials tokens expire in ~24 hours
- For production, consider implementing token refresh
- Or use the traditional custom app method if available

### 4. Phone Numbers Required
- Orders without customer phone numbers are **skipped**
- This is because the tracking lookup feature uses phone numbers
- Ensure customers provide phone numbers at checkout

### 5. Environment Variable Sync Issues
- Vercel env vars can get out of sync with local
- Always verify with `npx vercel env pull` after changes
- Make sure to redeploy after updating env vars

### 6. Webhook Signature Verification
- Webhooks use HMAC-SHA256 for verification
- The webhook secret is generated when you create the app
- Make sure `SHOPIFY_WEBHOOK_SECRET` matches in your env

## Troubleshooting

### "Failed to fetch orders from Shopify"
1. Verify the access token is correct and not expired
2. Check the store domain matches exactly (internal domain, not custom)
3. Test the API directly:
   ```bash
   curl "https://YOUR-STORE.myshopify.com/admin/api/2024-01/orders.json?limit=1" \
     -H "X-Shopify-Access-Token: shpat_YOUR_TOKEN"
   ```

### Orders synced but showing as "skipped"
- Orders without phone numbers are skipped
- Check the order data in Shopify for phone field

### Webhook not receiving events
1. Verify webhook is registered: Check Shopify admin > Settings > Notifications > Webhooks
2. Check your app URL is publicly accessible
3. Review Vercel function logs for errors

### Token expired
- Re-run the client_credentials curl command to get a new token
- Update both local `.env.local` and Vercel env vars
- Redeploy: `npx vercel --prod`

## Quick Reference Commands

```bash
# Get new access token
curl -X POST "https://978sp6-1n.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"

# Test API connection
curl "https://978sp6-1n.myshopify.com/admin/api/2024-01/orders.json?limit=1" \
  -H "X-Shopify-Access-Token: YOUR_TOKEN"

# List webhooks
curl "https://978sp6-1n.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: YOUR_TOKEN"

# Update Vercel env
npx vercel env add SHOPIFY_ACCESS_TOKEN production

# Deploy
npx vercel --prod
```

## Current Configuration (for reference)

- **Store Domain**: `978sp6-1n.myshopify.com`
- **App URL**: `https://presale-tracker.vercel.app`
- **Webhook Endpoint**: `https://presale-tracker.vercel.app/api/webhooks/shopify/orders`
- **Webhook Topic**: `orders/create`
