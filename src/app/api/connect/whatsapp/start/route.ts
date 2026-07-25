import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { issueOAuthState } from "@/lib/oauth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const response = NextResponse.json({ configurationId: env.metaWhatsappConfigId, graphVersion: "v25.0" });
  const state = issueOAuthState(response, "whatsapp", session);
  response.headers.set("X-Volitex-OAuth-State", state);
  return response;
}
