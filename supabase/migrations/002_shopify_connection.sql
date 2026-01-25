-- Table to store Shopify connection credentials
CREATE TABLE IF NOT EXISTS shopify_connection (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shopify_connection ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (backend only)
CREATE POLICY "Service role only" ON shopify_connection
  FOR ALL USING (false);
