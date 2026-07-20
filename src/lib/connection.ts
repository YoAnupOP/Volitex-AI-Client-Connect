import { database } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";

export type ConnectionMetadata = {
  whatsapp?: {
    businessName?: string; businessId?: string | null; connectedAt?: string;
    facebookUserId?: string; status?: "disconnected"; disconnectedAt?: string;
  };
  instagram?: {
    username?: string; grantedPermissions?: string[]; connectedAt?: string;
    status?: "disconnected" | "deleted"; disconnectedAt?: string; deletedAt?: string;
  };
};

export type Tenant = {
  id: string; client_name: string; phone_number_id: string | null; waba_id: string | null;
  instagram_business_account_id: string | null; instagram_page_id: string | null;
  meta_connection_metadata: ConnectionMetadata | null;
};

export async function getTenant(tenantId: string): Promise<Tenant> {
  const { data, error } = await database().from("tenants")
    .select("id, client_name, phone_number_id, waba_id, instagram_business_account_id, instagram_page_id, meta_connection_metadata")
    .eq("id", tenantId).single();
  if (error || !data) throw new Error("Unable to load tenant connection status");
  return data as Tenant;
}

export async function saveWhatsappConnection(input: { tenantId: string; token: string; wabaId: string; phoneNumberId: string; businessName: string; businessId: string | null; facebookUserId?: string }) {
  const tenant = await getTenant(input.tenantId);
  const metadata: ConnectionMetadata = {
    ...(tenant.meta_connection_metadata ?? {}),
    whatsapp: { businessName: input.businessName, businessId: input.businessId, connectedAt: new Date().toISOString(), facebookUserId: input.facebookUserId },
  };
  const { error } = await database().from("tenants").update({
    waba_id: input.wabaId, phone_number_id: input.phoneNumberId, meta_access_token: encrypt(input.token), meta_connection_metadata: metadata,
  }).eq("id", input.tenantId);
  if (error) throw new Error("Unable to save WhatsApp connection");
}

export async function saveInstagramConnection(input: { tenantId: string; token: string; accountId: string; username: string; permissions: string[] }) {
  const tenant = await getTenant(input.tenantId);
  const metadata: ConnectionMetadata = {
    ...(tenant.meta_connection_metadata ?? {}),
    instagram: { username: input.username, grantedPermissions: input.permissions, connectedAt: new Date().toISOString() },
  };
  const { error } = await database().from("tenants").update({
    instagram_business_account_id: input.accountId, instagram_access_token: encrypt(input.token), meta_connection_metadata: metadata,
  }).eq("id", input.tenantId);
  if (error) throw new Error("Unable to save Instagram connection");
}

export async function disconnect(tenantId: string, provider: "whatsapp" | "instagram") {
  const tenant = await getTenant(tenantId);
  const metadata = { ...(tenant.meta_connection_metadata ?? {}) };
  delete metadata[provider];
  const update = provider === "whatsapp"
    ? { waba_id: null, phone_number_id: null, meta_access_token: null, meta_connection_metadata: metadata }
    : { instagram_business_account_id: null, instagram_page_id: null, instagram_access_token: null, meta_connection_metadata: metadata };
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
      meta_connection_metadata: metadata,
      status: "disconnected",
    }).eq("id", tenant.id);
    if (error) throw new Error("Unable to remove WhatsApp connection");
  }
  return matches.map((tenant) => tenant.id as string);
}
