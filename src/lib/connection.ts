import { database } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";

export type ConnectionMetadata = {
  whatsapp?: {
    businessName?: string; businessId?: string | null; connectedAt?: string;
    facebookUserId?: string; onboardingType?: "cloud_api" | "coexistence";
    status?: "disconnected" | "pending_phone" | "syncing" | "reonboarding";
    disconnectedAt?: string;
  };
  instagram?: {
    username?: string; grantedPermissions?: string[]; connectedAt?: string;
    status?: "disconnected" | "deleted"; disconnectedAt?: string; deletedAt?: string;
  };
};

export type Tenant = {
  id: string; client_name: string; phone_number_id: string | null; waba_id: string | null;
  whatsapp_business_id: string | null; whatsapp_onboarding_type: "cloud_api" | "coexistence" | null;
  whatsapp_onboarded_at: string | null; whatsapp_sync_deadline_at: string | null;
  whatsapp_contacts_sync_state: "not_started" | "initiating" | "requested" | "failed_unknown";
  whatsapp_contacts_sync_request_id: string | null; whatsapp_contacts_sync_started_at: string | null;
  whatsapp_history_sync_state: "not_started" | "initiating" | "requested" | "failed_unknown";
  whatsapp_history_sync_request_id: string | null; whatsapp_history_sync_started_at: string | null;
  instagram_business_account_id: string | null; instagram_page_id: string | null;
  instagram_access_token: string | null; instagram_token_expires_at: string | null;
  meta_connection_metadata: ConnectionMetadata | null;
  primary_contact_name?: string | null; primary_contact_email?: string | null; primary_contact_phone?: string | null;
  market_code?: string | null; timezone?: string | null; locale?: string | null;
  client_type?: string | null; internal_note?: string | null; sales_owner?: string | null;
  portal_access_paused?: boolean;
};
export type ServiceProvider = "whatsapp" | "instagram";
export type ServiceStatus = "not_started" | "invite_sent" | "connection_received" | "ops_setup" | "testing" | "live" | "action_needed" | "disabled";
export type TenantService = { id: string; tenant_id: string; provider: ServiceProvider; status: ServiceStatus; enabled_at: string | null; connected_at: string | null; live_at: string | null; status_note: string | null };

export async function getTenant(tenantId: string): Promise<Tenant> {
  const { data, error } = await database().from("tenants")
    .select("id, client_name, phone_number_id, waba_id, whatsapp_business_id, whatsapp_onboarding_type, whatsapp_onboarded_at, whatsapp_sync_deadline_at, whatsapp_contacts_sync_state, whatsapp_contacts_sync_request_id, whatsapp_contacts_sync_started_at, whatsapp_history_sync_state, whatsapp_history_sync_request_id, whatsapp_history_sync_started_at, instagram_business_account_id, instagram_page_id, instagram_access_token, instagram_token_expires_at, meta_connection_metadata, primary_contact_name, primary_contact_email, primary_contact_phone, market_code, timezone, locale, client_type, internal_note, sales_owner, portal_access_paused")
    .eq("id", tenantId).single();
  if (error || !data) throw new Error("Unable to load tenant connection status");
  return data as Tenant;
}

export async function getTenantServices(tenantId: string): Promise<TenantService[]> {
  const { data, error } = await database().from("tenant_services").select("id, tenant_id, provider, status, enabled_at, connected_at, live_at, status_note").eq("tenant_id", tenantId).order("provider");
  if (error) throw new Error("Unable to load service scope"); return (data ?? []) as TenantService[];
}
export async function isProviderEnabled(tenantId: string, provider: ServiceProvider) {
  const { data } = await database().from("tenant_services").select("id").eq("tenant_id", tenantId).eq("provider", provider).neq("status", "disabled").maybeSingle(); return Boolean(data);
}
export async function setServiceConnectionReceived(tenantId: string, provider: ServiceProvider) {
  const { error } = await database().from("tenant_services").update({ status: "connection_received", connected_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", provider);
  if (error) throw new Error("Unable to update service lifecycle");
}

export async function saveWhatsappConnection(input: {
  tenantId: string; token: string; wabaId: string; phoneNumberId: string | null;
  businessName: string; businessId: string | null; facebookUserId?: string;
  onboardingType: "cloud_api" | "coexistence"; syncDeadlineAt?: string | null;
}) {
  const tenant = await getTenant(input.tenantId);
  const now = new Date().toISOString();
  const metadata: ConnectionMetadata = {
    ...(tenant.meta_connection_metadata ?? {}),
    whatsapp: {
      businessName: input.businessName, businessId: input.businessId, connectedAt: now,
      facebookUserId: input.facebookUserId, onboardingType: input.onboardingType,
      status: input.phoneNumberId ? undefined : input.onboardingType === "coexistence" ? "syncing" : "pending_phone",
    },
  };
  const { error } = await database().from("tenants").update({
    waba_id: input.wabaId,
    phone_number_id: input.phoneNumberId,
    meta_access_token: encrypt(input.token),
    whatsapp_business_id: input.businessId,
    whatsapp_onboarding_type: input.onboardingType,
    whatsapp_onboarded_at: now,
    whatsapp_sync_deadline_at: input.syncDeadlineAt ?? null,
    whatsapp_contacts_sync_state: "not_started",
    whatsapp_contacts_sync_request_id: null,
    whatsapp_contacts_sync_started_at: null,
    whatsapp_history_sync_state: "not_started",
    whatsapp_history_sync_request_id: null,
    whatsapp_history_sync_started_at: null,
    meta_connection_metadata: metadata,
  }).eq("id", input.tenantId);
  if (error) throw new Error("Unable to save WhatsApp connection");
  await setServiceConnectionReceived(input.tenantId, "whatsapp");
}

type SyncKind = "contacts" | "history";

/** Claims a one-time SMB sync before calling Meta, preventing duplicate API calls on retry. */
export async function claimWhatsappSync(tenantId: string, kind: SyncKind): Promise<boolean> {
  const stateColumn = kind === "contacts" ? "whatsapp_contacts_sync_state" : "whatsapp_history_sync_state";
  const startedColumn = kind === "contacts" ? "whatsapp_contacts_sync_started_at" : "whatsapp_history_sync_started_at";
  const { data, error } = await database().from("tenants")
    .update({ [stateColumn]: "initiating", [startedColumn]: new Date().toISOString() })
    .eq("id", tenantId)
    .eq(stateColumn, "not_started")
    .select("id");
  if (error) throw new Error(`Unable to claim ${kind} synchronization`);
  return Boolean(data?.length);
}

export async function completeWhatsappSync(tenantId: string, kind: SyncKind, requestId: string) {
  const stateColumn = kind === "contacts" ? "whatsapp_contacts_sync_state" : "whatsapp_history_sync_state";
  const requestIdColumn = kind === "contacts" ? "whatsapp_contacts_sync_request_id" : "whatsapp_history_sync_request_id";
  const { error } = await database().from("tenants")
    .update({ [stateColumn]: "requested", [requestIdColumn]: requestId })
    .eq("id", tenantId);
  if (error) throw new Error(`Unable to record ${kind} synchronization`);
}

/** A network timeout is intentionally terminal: retrying Meta's one-time sync may corrupt onboarding. */
export async function markWhatsappSyncUncertain(tenantId: string, kind: SyncKind) {
  const stateColumn = kind === "contacts" ? "whatsapp_contacts_sync_state" : "whatsapp_history_sync_state";
  await database().from("tenants").update({ [stateColumn]: "failed_unknown" }).eq("id", tenantId);
}

export async function confirmCoexistencePhoneNumber(tenantId: string, phoneNumberId: string) {
  const tenant = await getTenant(tenantId);
  const metadata: ConnectionMetadata = { ...(tenant.meta_connection_metadata ?? {}) };
  if (metadata.whatsapp) metadata.whatsapp.status = undefined;
  const { error } = await database().from("tenants")
    .update({ phone_number_id: phoneNumberId, meta_connection_metadata: metadata })
    .eq("id", tenantId);
  if (error) throw new Error("Unable to record Coexistence phone number");
}

export async function saveInstagramConnection(input: { tenantId: string; token: string; accountId: string; username: string; permissions: string[]; expiresAt: string }) {
  const tenant = await getTenant(input.tenantId);
  const metadata: ConnectionMetadata = {
    ...(tenant.meta_connection_metadata ?? {}),
    instagram: { username: input.username, grantedPermissions: input.permissions, connectedAt: new Date().toISOString() },
  };
  const { error } = await database().from("tenants").update({
    instagram_business_account_id: input.accountId, instagram_access_token: encrypt(input.token), instagram_token_expires_at: input.expiresAt, meta_connection_metadata: metadata,
  }).eq("id", input.tenantId);
  if (error) throw new Error("Unable to save Instagram connection");
  await setServiceConnectionReceived(input.tenantId, "instagram");
}

export async function getTenantsWithExpiringInstagramTokens(withinDays: number): Promise<Tenant[]> {
  const now = new Date();
  const expiresBy = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  const { data, error } = await database().from("tenants")
    .select("id, client_name, phone_number_id, waba_id, instagram_business_account_id, instagram_page_id, instagram_access_token, instagram_token_expires_at, meta_connection_metadata")
    .not("instagram_access_token", "is", null)
    .not("instagram_token_expires_at", "is", null)
    .gt("instagram_token_expires_at", now.toISOString())
    .lte("instagram_token_expires_at", expiresBy.toISOString());
  if (error) throw new Error("Unable to load expiring Instagram tokens");
  return (data ?? []) as Tenant[];
}

export async function updateInstagramToken(tenantId: string, encryptedToken: string, expiresAt: string) {
  const { error } = await database().from("tenants").update({
    instagram_access_token: encryptedToken,
    instagram_token_expires_at: expiresAt,
  }).eq("id", tenantId);
  if (error) throw new Error("Unable to update Instagram token");
}

export async function disconnect(tenantId: string, provider: "whatsapp" | "instagram") {
  const tenant = await getTenant(tenantId);
  const metadata = { ...(tenant.meta_connection_metadata ?? {}) };
  delete metadata[provider];
  const update = provider === "whatsapp"
    ? {
      waba_id: null, phone_number_id: null, meta_access_token: null,
      whatsapp_business_id: null, whatsapp_onboarding_type: null, whatsapp_onboarded_at: null,
      whatsapp_sync_deadline_at: null, whatsapp_contacts_sync_state: "not_started",
      whatsapp_contacts_sync_request_id: null, whatsapp_contacts_sync_started_at: null,
      whatsapp_history_sync_state: "not_started", whatsapp_history_sync_request_id: null,
      whatsapp_history_sync_started_at: null, meta_connection_metadata: metadata,
    }
    : { instagram_business_account_id: null, instagram_page_id: null, instagram_access_token: null, instagram_token_expires_at: null, meta_connection_metadata: metadata };
  const { error } = await database().from("tenants").update(update).eq("id", tenantId);
  if (error) throw new Error(`Unable to disconnect ${provider}`);
}

export async function removeInstagramConnectionByAccountId(accountId: string, mode: "deauthorized" | "deleted") {
  const { data: tenants, error: lookupError } = await database().from("tenants")
    .select("id, meta_connection_metadata").eq("instagram_business_account_id", accountId);
  if (lookupError) throw new Error("Unable to find Instagram connection");

  const now = new Date().toISOString();
  for (const tenant of tenants ?? []) {
    const metadata: ConnectionMetadata = { ...(tenant.meta_connection_metadata as ConnectionMetadata ?? {}) };
    // Preserve only non-profile lifecycle information; usernames, permissions, IDs, and tokens are removed.
    metadata.instagram = mode === "deleted" ? { status: "deleted", deletedAt: now } : { status: "disconnected", disconnectedAt: now };
    const { error } = await database().from("tenants").update({
      instagram_access_token: null,
      instagram_token_expires_at: null,
      instagram_business_account_id: null,
      instagram_page_id: null,
      meta_connection_metadata: metadata,
    }).eq("id", tenant.id);
    if (error) throw new Error("Unable to remove Instagram connection");
  }
  return (tenants ?? []).map((tenant) => tenant.id as string);
}

export async function removeWhatsappConnectionByMetaUserId(userId: string, mode: "deauthorized" | "deleted") {
  const { data: tenants, error: lookupError } = await database().from("tenants")
    .select("id, waba_id, phone_number_id, meta_connection_metadata");
  if (lookupError) throw new Error("Unable to find WhatsApp connection");

  const matches = (tenants ?? []).filter((tenant) => {
    const metadata = tenant.meta_connection_metadata as ConnectionMetadata | null;
    return tenant.waba_id === userId || tenant.phone_number_id === userId || metadata?.whatsapp?.facebookUserId === userId;
  });
  const now = new Date().toISOString();
  for (const tenant of matches) {
    const metadata: ConnectionMetadata = { ...((tenant.meta_connection_metadata as ConnectionMetadata | null) ?? {}) };
    if (mode === "deauthorized") metadata.whatsapp = { status: "disconnected", disconnectedAt: now };
    else delete metadata.whatsapp;
    const { error } = await database().from("tenants").update({
      meta_access_token: null,
      waba_id: null,
      phone_number_id: null,
      whatsapp_business_id: null,
      whatsapp_onboarding_type: null,
      whatsapp_onboarded_at: null,
      whatsapp_sync_deadline_at: null,
      whatsapp_contacts_sync_state: "not_started",
      whatsapp_contacts_sync_request_id: null,
      whatsapp_contacts_sync_started_at: null,
      whatsapp_history_sync_state: "not_started",
      whatsapp_history_sync_request_id: null,
      whatsapp_history_sync_started_at: null,
      meta_connection_metadata: metadata,
      status: "disconnected",
    }).eq("id", tenant.id);
    if (error) throw new Error("Unable to remove WhatsApp connection");
  }
  return matches.map((tenant) => tenant.id as string);
}
