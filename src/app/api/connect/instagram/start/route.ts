import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { issueOAuthState } from "@/lib/oauth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", env.appUrl));
  const response = NextResponse.redirect(new URL("/dashboard", env.appUrl));
  const state = issueOAuthState(response, "instagram", session);
  const authorize = new URL("https://www.instagram.com/oauth/authorize");
  authorize.searchParams.set("client_id", env.metaAppId);
  authorize.searchParams.set("redirect_uri", `${env.appUrl}/api/connect/instagram/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_messages");
  authorize.searchParams.set("state", state);
  response.headers.set("Location", authorize.toString());
  return response;
}
