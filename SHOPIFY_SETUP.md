# Shopify Integration Setup Guide

This guide will walk you through setting up automatic order syncing from your Shopify store.

## Prerequisites

- A Shopify store
- Admin access to your Shopify store
- Your app deployed to a publicly accessible URL (required for webhooks)

## Step 1: Get Your Shopify Admin API Token

1. Log in to your Shopify admin panel
2. Go to **Settings** > **Apps and sales channels**
3. Click **Develop apps** (you may need to enable custom app development first)
4. Click **Create an app**
5. Name your app (e.g., "Presale Order Tracker")
6. Click **Configure Admin API scopes**
7. Select the following scopes:
   - `read_orders` - To read order data
   - `read_customers` - To read customer information
8. Click **Save**
9. Click **Install app**
10. Click **Reveal token once** and copy the **Admin API access token**
   - It will look like: `shpat_xxxxxxxxxxxxxxxxxxxxx`
   - **Important**: Save this token securely - you can only see it once!

## Step 2: Configure Environment Variables

Update your `.env.local` file with the following:

```env
# Shopify Integration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=your_random_secret_string

# App URL (required for webhooks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Replace:
- `your-store.myshopify.com` with your actual Shopify store domain
- `shpat_xxxxxxxxxxxxxxxxxxxxx` with your Admin API access token from Step 1
- `your_random_secret_string` with a random secret (e.g., generate one with `openssl rand -hex 32`)
- `https://your-app.vercel.app` with your deployed app URL

**Important for local development:**
- Webhooks require a publicly accessible URL
- For local testing, use a tool like [ngrok](https://ngrok.com/) to create a tunnel:
  ```bash
  ngrok http 3000
  ```
  Then use the ngrok URL as your `NEXT_PUBLIC_APP_URL`

## Step 3: Deploy Your App

1. Make sure all environment variables are set in your deployment platform (Vercel, etc.)
2. Deploy your app
3. Verify your app is accessible at the URL you set in `NEXT_PUBLIC_APP_URL`

## Step 4: Connect Shopify in the Admin Dashboard

1. Go to your app's admin dashboard
2. Scroll to the **Shopify Integration** section
3. Click **Enter Access Token Manually**
4. Paste your Admin API access token
5. Click **Save Token**

This will:
- Save your connection to the database
- Automatically register a webhook with Shopify for `orders/create` events
- Enable real-time order syncing

## Step 5: Test the Integration

### Test Webhook Registration

1. Log in to your Shopify admin
2. Go to **Settings** > **Notifications**
3. Scroll down to **Webhooks**
4. You should see a webhook for "Order creation" pointing to your app URL

### Test Order Sync

Create a test order in your Shopify store:
1. Go to **Orders** > **Create order**
2. Fill in customer details (make sure to include a phone number)
3. Add a product
4. Click **Create order**

The order should appear in your presale tracker within seconds!

### Manual Sync

You can also manually sync existing orders:
1. Go to your admin dashboard
2. Click **Sync Orders from Shopify**
3. This will fetch and import all orders from Shopify (up to 250)

## Troubleshooting

### Webhooks not working

1. Check that `NEXT_PUBLIC_APP_URL` is set to your publicly accessible URL
2. Verify the webhook is registered in Shopify admin > Settings > Notifications > Webhooks
3. Check your server logs for webhook verification errors
4. Make sure `SHOPIFY_WEBHOOK_SECRET` matches on both sides

### Orders not appearing

1. Check that orders have a customer phone number (required)
2. Verify the access token has the correct scopes (`read_orders`, `read_customers`)
3. Check server logs for errors
4. Try manual sync to see if there are any error messages

### Token errors

1. Make sure you copied the entire token including the `shpat_` prefix
2. Verify you're using the Admin API access token, not the API key
3. Check that the token hasn't been revoked in Shopify admin

## How It Works

1. **Automatic Sync**: When an order is created in Shopify, Shopify sends a webhook to your app
2. **Webhook Handler**: Your app verifies the webhook signature and processes the order
3. **Order Creation**: The order is created in your database with progress tracking initialized
4. **Manual Sync**: You can also manually sync orders using the button in the admin dashboard

## Security

- Webhooks are verified using HMAC-SHA256 signatures
- Only authenticated admin users can configure Shopify integration
- Access tokens are stored securely in environment variables
- The webhook secret ensures only Shopify can send webhooks to your app
