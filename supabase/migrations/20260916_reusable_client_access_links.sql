-- Client links are intentionally reusable on any device for their 24-hour lifetime.
-- Regenerating a link is the only early revocation mechanism.
update public.client_access_tokens set used_at = null where used_at is not null;
