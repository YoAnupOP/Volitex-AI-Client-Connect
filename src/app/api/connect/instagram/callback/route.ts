import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { consumeOAuthState, verifyOAuthState } from "@/lib/oauth";
import { saveInstagramConnection } from "@/lib/connection";

function dashboardError(message: string) { return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(message)}`, env.appUrl)); }

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
    const token = await exchange.json() as { access_token?: string; user_id?: string; permissions?: string[] };
    if (!token.access_token || !token.user_id) throw new Error("Instagram did not return a usable account");
    const profileResponse = await fetch(`https://graph.instagram.com/me?${new URLSearchParams({ fields: "id,username", access_token: token.access_token })}`, { cache: "no-store" });
    if (!profileResponse.ok) throw new Error("Unable to retrieve Instagram profile");
    const profile = await profileResponse.json() as { id?: string; username?: string };
    if (!profile.id || !profile.username) throw new Error("Instagram account must be a professional account");
    await saveInstagramConnection({ tenantId: session.tenantId, token: token.access_token, accountId: profile.id, username: profile.username, permissions: token.permissions ?? ["instagram_business_basic", "instagram_business_manage_messages", "instagram_business_manage_comments"] });
    const response = NextResponse.redirect(new URL("/dashboard?connected=instagram", env.appUrl));
    consumeOAuthState(response, "instagram");
    return response;
  } catch {
    const response = dashboardError("Instagram could not be connected. Confirm it is a professional account and try again.");
    consumeOAuthState(response, "instagram");
    return response;
  }
}
