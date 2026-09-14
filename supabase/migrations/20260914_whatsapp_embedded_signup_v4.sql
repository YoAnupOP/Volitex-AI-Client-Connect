-- Embedded Signup v4 / WhatsApp Business app (Coexistence) lifecycle state.
-- The existing encrypted `meta_access_token` remains the customer business token.
alter table public.tenants
  add column if not exists whatsapp_business_id text,
  add column if not exists whatsapp_onboarding_type text,
  add column if not exists whatsapp_onboarded_at timestamptz,
  add column if not exists whatsapp_sync_deadline_at timestamptz,
  add column if not exists whatsapp_contacts_sync_state text not null default 'not_started',
  add column if not exists whatsapp_contacts_sync_request_id text,
  add column if not exists whatsapp_contacts_sync_started_at timestamptz,
  add column if not exists whatsapp_history_sync_state text not null default 'not_started',
  add column if not exists whatsapp_history_sync_request_id text,
  add column if not exists whatsapp_history_sync_started_at timestamptz;

alter table public.tenants
  drop constraint if exists tenants_whatsapp_onboarding_type_check,
  add constraint tenants_whatsapp_onboarding_type_check
    check (whatsapp_onboarding_type is null or whatsapp_onboarding_type in ('cloud_api', 'coexistence'));

alter table public.tenants
  drop constraint if exists tenants_whatsapp_contacts_sync_state_check,
  add constraint tenants_whatsapp_contacts_sync_state_check
    check (whatsapp_contacts_sync_state in ('not_started', 'initiating', 'requested', 'failed_unknown')),
  drop constraint if exists tenants_whatsapp_history_sync_state_check,
  add constraint tenants_whatsapp_history_sync_state_check
    check (whatsapp_history_sync_state in ('not_started', 'initiating', 'requested', 'failed_unknown'));
