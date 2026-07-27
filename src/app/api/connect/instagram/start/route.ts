import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { issueOAuthState } from "@/lib/oauth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", env.appUrl));
  const authorize = new URL("https://www.instagram.com/oauth/authorize");
  authorize.searchParams.set("client_id", env.instagramAppId);
  authorize.searchParams.set("redirect_uri", env.instagramRedirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments");
  authorize.searchParams.set("force_reauth", "true");
  const response = NextResponse.redirect(authorize.toString());
  const state = issueOAuthState(response, "instagram", session);
  authorize.searchParams.set("state", state);
  response.headers.set("Location", authorize.toString());
  return response;
}
