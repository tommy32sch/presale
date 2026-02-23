-- Fix: stages table has a SELECT policy but RLS was never enabled.
-- Without RLS enabled, the policy is ignored and anon key can INSERT/UPDATE/DELETE.
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

-- The existing "Public read stages" policy already allows SELECT for everyone.
-- Add service role full access so admin operations still work.
CREATE POLICY "Service role full access" ON stages
  FOR ALL USING (auth.role() = 'service_role');
