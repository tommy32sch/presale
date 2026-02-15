# Live Inventory Counter - Setup Guide

A real-time inventory counter that displays stock quantities on Shopify product pages with live updates.

## Files Included

```
theme/
├── assets/
│   ├── inventory-counter.js    # Real-time polling logic
│   └── inventory-counter.css   # Counter styling
├── snippets/
│   └── inventory-counter.liquid # Display template
└── config/
    └── settings_schema.json    # Theme settings (partial)
```

## Installation

### Step 1: Copy Files to Your Theme

1. Go to **Shopify Admin → Online Store → Themes**
2. Click **Actions → Edit code** on your active theme
3. Copy the files to their respective locations:
   - `assets/inventory-counter.js` → Add to `Assets` folder
   - `assets/inventory-counter.css` → Add to `Assets` folder
   - `snippets/inventory-counter.liquid` → Add to `Snippets` folder

### Step 2: Add Theme Settings

Merge the contents of `config/settings_schema.json` into your theme's existing `config/settings_schema.json` file.

Add the "Live Inventory Counter" section object to your theme's settings array.

### Step 3: Load Assets in Theme

Add these lines to your `theme.liquid` file (inside the `<head>` tag):

```liquid
{{ 'inventory-counter.css' | asset_url | stylesheet_tag }}
```

And before the closing `</body>` tag:

```liquid
{{ 'inventory-counter.js' | asset_url | script_tag }}
```

### Step 4: Add Counter to Product Template

Add this line to your product template (e.g., `sections/main-product.liquid` or `templates/product.liquid`) where you want the counter to appear:

```liquid
{% render 'inventory-counter', product: product, current_variant: current_variant %}
```

**Recommended placement:** Below the product title, above or beside the Add to Cart button.

### Step 5: Create Storefront API Token

1. Go to **Shopify Admin → Settings → Apps and sales channels**
2. Click **Develop apps**
3. Click **Create an app**
4. Name it "Inventory Counter" (or similar)
5. Under **Configuration**, click **Configure Storefront API scopes**
6. Enable: `unauthenticated_read_product_inventory`
7. Click **Save**
8. Go to **API credentials** tab
9. Click **Install app**
10. Copy the **Storefront API access token**

### Step 6: Configure Theme Settings

1. Go to **Online Store → Themes → Customize**
2. Click the gear icon (Theme settings)
3. Find **Live Inventory Counter** section
4. Paste your Storefront API token
5. Adjust update frequency if desired (default: 5 seconds)
6. Enable the counter
7. **Save**

## How It Works

1. **Initial Load**: Liquid renders the current inventory from Shopify's database
2. **Polling Starts**: JavaScript begins polling the Storefront API every N seconds
3. **Updates Detected**: When inventory changes, the display updates with a subtle animation
4. **Sold Out**: When inventory hits zero, shows "Sold Out" badge and disables Add to Cart
5. **Tab Hidden**: Polling pauses when browser tab is not visible (saves API calls)
6. **Tab Visible**: Polling resumes when user returns to the tab

## Variant Support

The counter automatically updates when customers select different variants:

- All variant inventory is cached on first API fetch
- Variant changes update instantly from cache
- Works with select dropdowns, radio buttons, and swatch selectors

## Customization

### CSS Custom Properties

Override these in your theme CSS to customize appearance:

```css
:root {
  --inventory-counter-font-size: 0.875rem;
  --inventory-counter-color: #666;
  --sold-out-badge-bg: #f5f5f5;
  --sold-out-badge-color: #999;
}
```

### Positioning

The counter uses flexible positioning. Add custom CSS to adjust:

```css
.inventory-counter {
  margin: 1rem 0;
  justify-content: flex-start; /* or center, flex-end */
}
```

## Troubleshooting

### Counter shows but doesn't update
- Verify the Storefront API token is correctly entered in theme settings
- Check browser console for errors
- Ensure the product has inventory tracking enabled in Shopify

### Counter doesn't appear
- Verify `inventory_counter_enabled` is checked in theme settings
- Ensure the product has inventory management set to "Shopify tracks this product's inventory"
- Check that the snippet is properly included in your product template

### Variant changes don't update counter
- Different themes handle variant selection differently
- The script listens for common patterns but may need adjustment for custom themes
- Check if your theme fires a `variant:changed` custom event

### API rate limiting
- The default 5-second interval is well within Storefront API limits
- If you have many concurrent users, consider increasing the interval to 10-15 seconds

## Browser Support

- Chrome, Firefox, Safari, Edge (modern versions)
- Uses Page Visibility API (supported in all modern browsers)
- Gracefully degrades: if JavaScript fails, the Liquid-rendered value still shows

## Security Notes

- The Storefront API token is **read-only** and safe to expose in frontend code
- Never use your Admin API token in frontend code
- The token only has access to public product inventory data
