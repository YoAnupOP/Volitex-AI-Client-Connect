import { decrypt, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { database } from "@/lib/supabase";

const ACCESS_TTL_MS = 1000 * 60 * 60 * 24;
const attempts = new Map<string, { count: number; resetAt: number }>();
export type AccessTokenState = "valid" | "expired" | "used" | "invalid" | "paused" | "limited";

export function checkAccessRateLimit(key: string) {
  const now = Date.now(); const item = attempts.get(key);
  if (!item || item.resetAt < now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  item.count += 1; return item.count <= 10;
}

export async function createAccessLink(tenantId: string, createdBy: string) {
  const token = randomToken(); const expiresAt = new Date(Date.now() + ACCESS_TTL_MS).toISOString(); const db = database();
  const { error: invalidateError } = await db.from("client_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("tenant_id", tenantId).is("revoked_at", null);
  if (invalidateError) throw new Error("Unable to invalidate the previous access link");
  const { error } = await db.from("client_access_tokens").insert({ tenant_id: tenantId, token_hash: sha256(token), token_encrypted: encrypt(token), expires_at: expiresAt, created_by: createdBy, delivery_channel: "manual" });
  if (error) throw new Error("Unable to create an access link"); return { token, expiresAt };
}

/** Returns the plaintext only to an authenticated server-rendered admin page. */
export async function getActiveAccessLink(tenantId: string): Promise<{ token: string; expiresAt: string } | null> {
  const { data } = await database().from("client_access_tokens").select("token_encrypted, expires_at").eq("tenant_id", tenantId).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.token_encrypted) return null;
  try { return { token: decrypt(data.token_encrypted), expiresAt: data.expires_at }; } catch { return null; }
}

export async function consumeAccessLink(token: string): Promise<{ state: AccessTokenState; tenantId?: string }> {
  const db = database(); const { data: link } = await db.from("client_access_tokens").select("id, tenant_id, expires_at, revoked_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!link) return { state: "invalid" }; if (link.revoked_at) return { state: "invalid" }; if (new Date(link.expires_at) <= new Date()) return { state: "expired" };
  const { data: tenant } = await db.from("tenants").select("portal_access_paused").eq("id", link.tenant_id).maybeSingle(); if (tenant?.portal_access_paused) return { state: "paused" };
  return { state: "valid", tenantId: link.tenant_id };
}
