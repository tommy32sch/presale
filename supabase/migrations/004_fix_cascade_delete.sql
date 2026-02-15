-- Fix missing ON DELETE CASCADE for notification_queue and messages tables
-- This allows orders to be deleted even when they have related records

ALTER TABLE notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_order_id_fkey,
  ADD CONSTRAINT notification_queue_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_order_id_fkey,
  ADD CONSTRAINT messages_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
