import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { checkAccessRateLimit, consumeAccessLink } from "@/lib/client-access";
import { randomToken } from "@/lib/crypto";
import { env } from "@/lib/env";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!checkAccessRateLimit(ip)) return NextResponse.redirect(new URL("/access-link?state=limited", env.appUrl));
  const { token } = await params; const result = await consumeAccessLink(token);
  if (result.state !== "valid" || !result.tenantId) return NextResponse.redirect(new URL(`/access-link?state=${result.state}`, env.appUrl));
  await createSession({ tenantId: result.tenantId, sessionId: randomToken() });
  return NextResponse.redirect(new URL("/dashboard", env.appUrl));
}
