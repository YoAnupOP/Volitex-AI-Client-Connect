-- The token hash remains the validation source. This encrypted copy is readable only
-- by authenticated server-side admin pages so an active link can be shown again.
alter table public.client_access_tokens add column if not exists token_encrypted text;
