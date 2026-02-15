-- Add normalized email column for consistent lookups
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_email_normalized TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_orders_email_normalized ON orders(customer_email_normalized);

-- Make phone fields nullable (orders may have only email)
ALTER TABLE orders
ALTER COLUMN customer_phone DROP NOT NULL,
ALTER COLUMN customer_phone_normalized DROP NOT NULL;

-- Populate normalized emails for existing orders
UPDATE orders
SET customer_email_normalized = LOWER(TRIM(customer_email))
WHERE customer_email IS NOT NULL AND customer_email != '';
