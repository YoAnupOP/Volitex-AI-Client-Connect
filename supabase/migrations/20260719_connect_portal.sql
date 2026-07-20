-- Volitex AI Client Connect Portal
-- Apply this migration to the existing Supabase database before deployment.

create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text not null unique,
  password_hash text,
  is_active boolean not null default true,
  invitation_token_hash text unique,
  invitation_expires_at timestamptz,
  invitation_accepted_at timestamptz,
  reset_token_hash text unique,
  reset_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_users_email_lowercase check (email = lower(email)),
  constraint client_users_invitation_pair check ((invitation_token_hash is null) = (invitation_expires_at is null)),
  constraint client_users_reset_pair check ((reset_token_hash is null) = (reset_expires_at is null))
);

-- Required only because the existing `tenants.phone_number_id` is NOT NULL while
-- the product explicitly supports a client before connection and after disconnect.
alter table public.tenants alter column phone_number_id drop not null;

-- A single additive JSON field preserves the stable tenant contract used by n8n,
-- while retaining only the connection metadata the portal must display/audit.
alter table public.tenants add column if not exists meta_connection_metadata jsonb not null default '{}'::jsonb;

alter table public.client_users enable row level security;
-- The portal uses the Supabase service-role key on the server only. No browser role
-- receives access to client_users, so no public RLS policy is intentionally added.
