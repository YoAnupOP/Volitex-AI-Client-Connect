import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { consumeOAuthState, verifyOAuthState } from "@/lib/oauth";
import { saveInstagramConnection } from "@/lib/connection";

function dashboardError(message: string) { return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(message)}`, env.appUrl)); }

type TokenResponse = { access_token?: unknown; user_id?: unknown; permissions?: unknown };

function tokenPayload(value: unknown): TokenResponse | null {
  if (!value || typeof value !== "object") return null;
  const response = value as TokenResponse & { data?: unknown };
  if (Array.isArray(response.data)) {
    const first = response.data[0];
    return first && typeof first === "object" ? first as TokenResponse : null;
  }
  return response;
}

function normalizePermissions(permissions: unknown): string[] {
  if (Array.isArray(permissions)) return permissions.filter((permission): permission is string => typeof permission === "string");
  if (typeof permissions === "string") return permissions.split(",").map((permission) => permission.trim()).filter(Boolean);
  return ["instagram_business_basic", "instagram_business_manage_messages", "instagram_business_manage_comments"];
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!session || !code || !state || !(await verifyOAuthState("instagram", state, session))) return dashboardError("Instagram authorization could not be verified. Please try again.");
  try {
    const exchange = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.instagramAppId, client_secret: env.instagramAppSecret, grant_type: "authorization_code", redirect_uri: env.instagramRedirectUri, code }),
      cache: "no-store",
    });
    if (!exchange.ok) throw new Error("Instagram code exchange failed");
    const token = tokenPayload(await exchange.json());
    if (!token || typeof token.access_token !== "string" || typeof token.user_id !== "string") throw new Error("Instagram did not return a usable account");
    let accessToken = token.access_token;
    let expiresIn = 60 * 60;
    try {
      const longLivedResponse = await fetch(`https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: env.instagramAppSecret, access_token: token.access_token })}`, { cache: "no-store" });
      if (!longLivedResponse.ok) throw new Error(`Instagram long-lived token exchange failed with status ${longLivedResponse.status}`);
      const longLivedToken = await longLivedResponse.json() as { access_token?: unknown; expires_in?: unknown };
      if (typeof longLivedToken.access_token !== "string" || typeof longLivedToken.expires_in !== "number") throw new Error("Instagram long-lived token exchange returned an invalid response");
      accessToken = longLivedToken.access_token;
      expiresIn = longLivedToken.expires_in;
    } catch (error) {
      console.warn("Unable to exchange Instagram short-lived token; saving short-lived token instead", error);
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const profileResponse = await fetch(`https://graph.instagram.com/me?${new URLSearchParams({ fields: "id,username", access_token: accessToken })}`, { cache: "no-store" });
    if (!profileResponse.ok) throw new Error("Unable to retrieve Instagram profile");
    const profile = await profileResponse.json() as { id?: string; username?: string };
    if (!profile.id || !profile.username) throw new Error("Instagram account must be a professional account");
    await saveInstagramConnection({ tenantId: session.tenantId, token: accessToken, accountId: profile.id, username: profile.username, permissions: normalizePermissions(token.permissions), expiresAt });
    const response = NextResponse.redirect(new URL("/dashboard?connected=instagram", env.appUrl));
    consumeOAuthState(response, "instagram");
    return response;
  } catch {
    const response = dashboardError("Instagram could not be connected. Confirm it is a professional account and try again.");
    consumeOAuthState(response, "instagram");
    return response;
  }
}
