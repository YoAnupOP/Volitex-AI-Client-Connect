-- Product lifecycle data is deliberately separate from encrypted Meta credentials.
alter table public.tenants
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text,
  add column if not exists market_code text,
  add column if not exists timezone text,
  add column if not exists locale text,
  add column if not exists client_type text,
  add column if not exists internal_note text,
  add column if not exists sales_owner text,
  add column if not exists portal_access_paused boolean not null default false;

-- Preserve the most recently created legacy contact email on its tenant, then remove
-- the password-era client account store. Client identity now lives on the tenant.
do $$ begin
  if to_regclass('public.client_users') is not null then
    update public.tenants t set primary_contact_email = coalesce(t.primary_contact_email, legacy.email)
    from (select distinct on (tenant_id) tenant_id, email from public.client_users order by tenant_id, created_at desc) legacy
    where t.id = legacy.tenant_id;
    drop table public.client_users;
  end if;
end $$;

create table if not exists public.tenant_services (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'instagram')),
  status text not null default 'not_started' check (status in ('not_started', 'invite_sent', 'connection_received', 'ops_setup', 'testing', 'live', 'action_needed', 'disabled')),
  enabled_at timestamptz, connected_at timestamptz, live_at timestamptz, status_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create table if not exists public.client_access_tokens (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, revoked_at timestamptz,
  delivery_channel text not null default 'manual' check (delivery_channel in ('whatsapp', 'email', 'manual')),
  created_by text not null, created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(), email text not null unique, password_hash text not null,
  role text not null default 'operator' check (role in ('owner', 'operator')),
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint admin_users_email_lowercase check (email = lower(email))
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid references public.tenants(id) on delete cascade,
  admin_id uuid references public.admin_users(id) on delete set null, event_type text not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.tenant_services enable row level security;
alter table public.client_access_tokens enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_events enable row level security;
-- All tables are accessed only by the server service role; no browser RLS policy is added.
