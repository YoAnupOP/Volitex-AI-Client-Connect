import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { issueOAuthState } from "@/lib/oauth";
import { isProviderEnabled } from "@/lib/connection";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!(await isProviderEnabled(session.tenantId, "whatsapp"))) return NextResponse.json({ error: "WhatsApp is not part of this connection" }, { status: 403 });
  const response = NextResponse.json({
    configurationId: env.metaWhatsappConfigId,
    graphVersion: env.metaGraphVersion,
    // Public by design; serving it here guarantees the SDK and code exchange use one App ID.
    appId: env.metaAppId,
  });
  const state = issueOAuthState(response, "whatsapp", session);
  response.headers.set("X-Volitex-OAuth-State", state);
  return response;
}
