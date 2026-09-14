import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyOAuthState } from "@/lib/oauth";

type SignupEvent = "FINISH" | "FINISH_ONLY_WABA" | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" | "CANCEL" | "ERROR";

/**
 * Receives non-secret client-side Embedded Signup telemetry. Asset onboarding
 * itself is handled by /finish so the exchange code is never logged here.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await request.json() as {
    state?: string; event?: SignupEvent; currentStep?: string;
    errorCode?: string | number; errorMessage?: string; sessionId?: string;
  };
  const accepted = body.event === "FINISH" || body.event === "FINISH_ONLY_WABA" ||
    body.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" || body.event === "CANCEL" || body.event === "ERROR";
  if (!body.state || !accepted || !(await verifyOAuthState("whatsapp", body.state, session))) {
    return NextResponse.json({ error: "Invalid WhatsApp signup event" }, { status: 400 });
  }
  // There is no event table in this service. Keep structured, tenant-scoped server logs
  // without recording auth codes, access tokens, or arbitrary Meta event data.
  console.info("WhatsApp Embedded Signup event", {
    tenantId: session.tenantId,
    event: body.event,
    currentStep: body.currentStep,
    errorCode: body.errorCode,
    errorMessage: body.errorMessage,
    sessionId: body.sessionId,
  });
  return NextResponse.json({ ok: true });
}
