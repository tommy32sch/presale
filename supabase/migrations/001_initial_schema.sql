-- Presale Order Tracker - Initial Schema
-- Run this in your Supabase SQL Editor

-- Create enum types
CREATE TYPE stage_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE notification_channel AS ENUM ('sms', 'email');
CREATE TYPE notification_status AS ENUM ('pending_review', 'approved', 'sent', 'failed');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE carrier_type AS ENUM ('fedex', 'ups', 'usps', 'dhl');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_phone_normalized TEXT NOT NULL,
  items_description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  carrier carrier_type,
  tracking_number TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  is_delayed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stages reference table (seeded once)
CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL UNIQUE,
  icon_name TEXT
);

-- Order progress (order-stage relationship)
CREATE TABLE order_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  stage_id INTEGER REFERENCES stages(id),
  status stage_status DEFAULT 'not_started',
  estimated_start_date DATE,
  estimated_end_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  admin_notes TEXT,
  UNIQUE(order_id, stage_id)
);

-- Photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  caption TEXT,
  stage_id INTEGER REFERENCES stages(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo-Order junction table (many-to-many)
CREATE TABLE order_photos (
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  PRIMARY KEY (order_id, photo_id)
);

-- Notification preferences
CREATE TABLE notification_preferences (
  order_id UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  email_enabled BOOLEAN DEFAULT FALSE,
  opted_in_at TIMESTAMPTZ,
  PRIMARY KEY (order_id)
);

-- Notification queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  stage_id INTEGER REFERENCES stages(id),
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status notification_status DEFAULT 'pending_review',
  batch_id UUID,
  reviewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (two-way communication)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_phone_normalized ON orders(customer_phone_normalized);
CREATE INDEX idx_orders_is_delayed ON orders(is_delayed) WHERE is_delayed = TRUE;
CREATE INDEX idx_orders_is_cancelled ON orders(is_cancelled);
CREATE INDEX idx_order_progress_order_id ON order_progress(order_id);
CREATE INDEX idx_order_progress_status ON order_progress(status);
CREATE INDEX idx_order_photos_order_id ON order_photos(order_id);
CREATE INDEX idx_order_photos_photo_id ON order_photos(photo_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_batch_id ON notification_queue(batch_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to orders table
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed the 7 manufacturing stages
INSERT INTO stages (name, display_name, description, sort_order, icon_name) VALUES
  ('payment_received', 'Payment Received', 'Your payment has been confirmed and your order is in our system.', 1, 'CreditCard'),
  ('sent_to_manufacturer', 'Order Sent to Manufacturer', 'Your order has been sent to our manufacturing partner.', 2, 'Send'),
  ('materials_sourcing', 'Materials Sourcing', 'We are sourcing the premium materials for your order.', 3, 'Package'),
  ('production_started', 'Production Started', 'Your items are now being crafted by our skilled artisans.', 4, 'Hammer'),
  ('quality_check', 'Quality Check', 'Your order is undergoing thorough quality inspection.', 5, 'CheckCircle'),
  ('shipped', 'Shipped', 'Your order has been shipped and is on its way to you.', 6, 'Truck'),
  ('delivered', 'Delivered', 'Your order has been delivered. Enjoy!', 7, 'Home');

-- Row Level Security (RLS) policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for server-side operations)
CREATE POLICY "Service role full access" ON orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON order_progress FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON photos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON order_photos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON notification_preferences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON notification_queue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON admin_users FOR ALL USING (auth.role() = 'service_role');

-- Allow anon read on stages (public reference data)
CREATE POLICY "Public read stages" ON stages FOR SELECT USING (true);
