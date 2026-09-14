import { env } from "@/lib/env";
import {
  claimWhatsappSync,
  completeWhatsappSync,
  markWhatsappSyncUncertain,
} from "@/lib/connection";

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };
type Waba = { name?: string; owner_business?: { id?: string } };
export type Phone = {
  id?: string; verified_name?: string; display_phone_number?: string;
  is_on_biz_app?: boolean; platform_type?: string;
};

function graphUrl(path: string) {
  return `https://graph.facebook.com/${env.metaGraphVersion}/${path}`;
}

async function graph(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(graphUrl(path), {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}`, ...init.headers },
  });
  const payload = await response.json().catch(() => ({})) as GraphError;
  if (!response.ok) {
    const message = payload.error?.message ?? `Graph request failed (${response.status})`;
    throw new Error(`${message}${payload.error?.code ? ` [${payload.error.code}]` : ""}`);
  }
  return payload as Record<string, unknown>;
}

export async function exchangeEmbeddedSignupCode(code: string) {
  const response = await fetch(graphUrl("oauth/access_token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.metaAppId, client_secret: env.metaAppSecret, code }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { access_token?: unknown } & GraphError;
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(payload.error?.message ?? "Code exchange failed");
  }
  return payload.access_token;
}

export async function getWhatsappBusinessAccount(wabaId: string, accessToken: string) {
  return await graph(`${encodeURIComponent(wabaId)}?fields=name,owner_business{id}`, accessToken) as Waba;
}

export async function getPhoneNumber(phoneNumberId: string, accessToken: string) {
  return await graph(`${encodeURIComponent(phoneNumberId)}?fields=id,verified_name,display_phone_number,is_on_biz_app,platform_type`, accessToken) as Phone;
}

/** Meta sends only a WABA ID for Coexistence, so resolve its Cloud API + Business app number server-side. */
export async function getCoexistencePhoneNumber(wabaId: string, accessToken: string) {
  const payload = await graph(`${encodeURIComponent(wabaId)}/phone_numbers?fields=id,verified_name,display_phone_number,is_on_biz_app,platform_type`, accessToken) as { data?: Phone[] };
  const matches = (payload.data ?? []).filter((phone) => phone.id && phone.is_on_biz_app === true && phone.platform_type === "CLOUD_API");
  if (matches.length !== 1 || !matches[0].id) {
    throw new Error("Could not uniquely identify the WhatsApp Business app phone number for synchronization");
  }
  return matches[0] as Phone & { id: string };
}

/** Required for every customer WABA; dashboard field subscriptions alone are insufficient. */
export async function subscribeAppToWaba(wabaId: string, accessToken: string) {
  await graph(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken, { method: "POST" });
}

/** Standard Cloud API only. Coexistence numbers are already registered and must never use this endpoint. */
export async function registerCloudApiPhoneNumber(phoneNumberId: string, accessToken: string) {
  await graph(`${encodeURIComponent(phoneNumberId)}/register`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", pin: env.metaWhatsappRegistrationPin }),
  });
}

async function initiateSync(tenantId: string, phoneNumberId: string, accessToken: string, kind: "contacts" | "history") {
  if (!(await claimWhatsappSync(tenantId, kind))) return;
  const syncType = kind === "contacts" ? "smb_app_state_sync" : "history";
  try {
    const result = await graph(`${encodeURIComponent(phoneNumberId)}/smb_app_data`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
    }) as { request_id?: unknown };
    if (typeof result.request_id !== "string" || !result.request_id) {
      throw new Error(`Meta did not return a ${kind} synchronization request ID`);
    }
    await completeWhatsappSync(tenantId, kind, result.request_id);
  } catch (error) {
    // A timeout can still mean Meta accepted a one-time request, so do not retry automatically.
    await markWhatsappSyncUncertain(tenantId, kind);
    throw error;
  }
}

/** Contacts must be initiated first; history follows immediately after a successful request. */
export async function initiateCoexistenceSync(tenantId: string, phoneNumberId: string, accessToken: string) {
  await initiateSync(tenantId, phoneNumberId, accessToken, "contacts");
  await initiateSync(tenantId, phoneNumberId, accessToken, "history");
}
