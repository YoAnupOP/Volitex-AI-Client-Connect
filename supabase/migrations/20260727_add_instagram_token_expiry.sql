ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMPTZ;
