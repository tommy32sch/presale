# Quick Reference: Get Shopify Access Token

## The Fast Way (Client Credentials)

Run this command, replacing YOUR_CLIENT_ID and YOUR_CLIENT_SECRET:

```bash
curl -X POST "https://978sp6-1n.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

## Your Credentials

- **Store Domain**: `978sp6-1n.myshopify.com`
- **Client ID**: `YOUR_CLIENT_ID` (see .env.local)
- **Client Secret**: `YOUR_CLIENT_SECRET` (see .env.local)

## Full Command (Ready to Run)

```bash
curl -X POST "https://978sp6-1n.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

## Response

```json
{
  "access_token": "shpat_xxxxxxxxxxxxxxxxxxxxx",
  "scope": "read_customers,read_orders",
  "expires_in": 86399
}
```

## Important

- Token expires in **~24 hours** (86399 seconds)
- After getting a new token, update:
  1. `.env.local` locally
  2. Vercel: `npx vercel env add SHOPIFY_ACCESS_TOKEN production`
  3. Redeploy: `npx vercel --prod`

## Full Setup Guide

See [SHOPIFY_SETUP.md](./SHOPIFY_SETUP.md) for complete documentation.
