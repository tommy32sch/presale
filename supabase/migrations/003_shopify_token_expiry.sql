-- Add token expiration tracking columns to shopify_connection
ALTER TABLE shopify_connection
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE shopify_connection
ADD COLUMN IF NOT EXISTS last_refresh_at TIMESTAMPTZ;

ALTER TABLE shopify_connection
ADD COLUMN IF NOT EXISTS refresh_error TEXT;
