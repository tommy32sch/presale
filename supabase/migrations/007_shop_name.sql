-- Add shop_name to shopify_connection
ALTER TABLE shopify_connection
ADD COLUMN IF NOT EXISTS shop_name TEXT;
