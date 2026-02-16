-- App-level settings table (single-row pattern, same as shopify_connection)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  production_target_days INTEGER NOT NULL DEFAULT 30,
  notify_on_stage_change BOOLEAN DEFAULT TRUE,
  notify_on_delay BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default row
INSERT INTO app_settings (id, production_target_days)
VALUES ('default', 30)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON app_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
