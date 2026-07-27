import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { getTenantsWithExpiringInstagramTokens, updateInstagramToken } from "@/lib/connection";
import { env } from "@/lib/env";

type RefreshResponse = { access_token?: unknown; expires_in?: unknown };

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = { refreshed: 0, failed: 0, skipped: 0, errors: [] as string[] };
  let tenants;
  try {
    tenants = await getTenantsWithExpiringInstagramTokens(7);
  } catch (error) {
    console.error("Unable to load Instagram tokens for refresh", error);
    return NextResponse.json({ ...summary, errors: ["Unable to load Instagram tokens for refresh"] }, { status: 500 });
  }

  for (const tenant of tenants) {
    if (!tenant.instagram_access_token) {
      summary.skipped += 1;
      continue;
    }
    try {
      const accessToken = decrypt(tenant.instagram_access_token);
      const response = await fetch(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: accessToken })}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Instagram token refresh failed with status ${response.status}`);
      const refreshed = await response.json() as RefreshResponse;
      if (typeof refreshed.access_token !== "string" || typeof refreshed.expires_in !== "number") throw new Error("Instagram token refresh returned an invalid response");
      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await updateInstagramToken(tenant.id, encrypt(refreshed.access_token), expiresAt);
      summary.refreshed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Unable to refresh Instagram token for tenant ${tenant.id}`, error);
      summary.failed += 1;
      summary.errors.push(`Tenant ${tenant.id}: ${message}`);
    }
  }

  return NextResponse.json(summary);
}
