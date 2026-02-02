# How to Get Your Shopify Admin API Token

Follow these steps to get your Shopify Admin API access token:

## Step 1: Enable Custom App Development (if needed)

1. Log in to your Shopify admin panel
2. Go to **Settings** (bottom left)
3. Click **Apps and sales channels**
4. Click **Develop apps** (top right)
5. If you see a button that says "Allow custom app development", click it and confirm

## Step 2: Create a Custom App

1. Click **Create an app** button
2. Enter an app name: **Presale Order Tracker**
3. Click **Create app**

## Step 3: Configure API Scopes

1. Click **Configure Admin API scopes**
2. Scroll down and find these scopes (use Ctrl+F/Cmd+F to search):
   - ✅ `read_orders` - Read orders
   - ✅ `read_customers` - Read customers
3. Check both boxes
4. Click **Save** at the top right

## Step 4: Install the App

1. Click the **API credentials** tab
2. Click **Install app**
3. Click **Install** to confirm

## Step 5: Get Your Access Token

1. After installation, you'll see an "Admin API access token" section
2. Click **Reveal token once**
3. **IMPORTANT**: Copy this token immediately and save it somewhere safe
4. It will look like: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. You can only see this token once - if you lose it, you'll need to uninstall and reinstall the app

## What to do with the token:

Paste it into your `.env.local` file:

```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=any_random_string_here
```

## Notes:

- The token never expires unless you uninstall the app
- Keep this token secure - don't share it or commit it to git
- If you need to regenerate it, you'll have to uninstall and reinstall the custom app
