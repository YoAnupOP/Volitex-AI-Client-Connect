import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { consumeOAuthState, verifyOAuthState } from "@/lib/oauth";
import { confirmCoexistencePhoneNumber, saveWhatsappConnection } from "@/lib/connection";
import { isProviderEnabled } from "@/lib/connection";
import {
  exchangeEmbeddedSignupCode,
  getCoexistencePhoneNumber,
  getPhoneNumber,
  getWhatsappBusinessAccount,
  initiateCoexistenceSync,
  registerCloudApiPhoneNumber,
  subscribeAppToWaba,
} from "@/lib/whatsapp-onboarding";

type SignupEvent = "FINISH" | "FINISH_ONLY_WABA" | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!(await isProviderEnabled(session.tenantId, "whatsapp"))) return NextResponse.json({ error: "WhatsApp is not part of this connection" }, { status: 403 });
  const body = await request.json() as {
    code?: string; state?: string; wabaId?: string; phoneNumberId?: string;
    businessId?: string; facebookUserId?: string; event?: SignupEvent;
  };
  const event = body.event;
  const validEvent = event === "FINISH" || event === "FINISH_ONLY_WABA" || event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
  if (!body.code || !body.state || !body.wabaId || !validEvent ||
    (event === "FINISH" && !body.phoneNumberId) ||
    !(await verifyOAuthState("whatsapp", body.state, session))) {
    return NextResponse.json({ error: "WhatsApp authorization could not be verified" }, { status: 400 });
  }
  try {
    // This is the customer-scoped business-token exchange used by Tech Providers.
    const token = await exchangeEmbeddedSignupCode(body.code);
    const waba = await getWhatsappBusinessAccount(body.wabaId, token);
    await subscribeAppToWaba(body.wabaId, token);

    if (event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      // Persist before requesting data so the one-time sync calls are guarded even on a duplicate browser POST.
      await saveWhatsappConnection({
        tenantId: session.tenantId, token, wabaId: body.wabaId, phoneNumberId: null,
        businessName: waba.name ?? "WhatsApp Business", businessId: waba.owner_business?.id ?? body.businessId ?? null,
        facebookUserId: body.facebookUserId, onboardingType: "coexistence", syncDeadlineAt: deadline,
      });
      const phone = await getCoexistencePhoneNumber(body.wabaId, token);
      // Do not call /register here: this number is already registered through Coexistence.
      await initiateCoexistenceSync(session.tenantId, phone.id, token);
      await confirmCoexistencePhoneNumber(session.tenantId, phone.id);
      const response = NextResponse.json({ ok: true, onboardingType: "coexistence" }); consumeOAuthState(response, "whatsapp"); return response;
    }

    if (event === "FINISH_ONLY_WABA") {
      await saveWhatsappConnection({
        tenantId: session.tenantId, token, wabaId: body.wabaId, phoneNumberId: null,
        businessName: waba.name ?? "WhatsApp Business", businessId: waba.owner_business?.id ?? body.businessId ?? null,
        facebookUserId: body.facebookUserId, onboardingType: "cloud_api",
      });
      const response = NextResponse.json({ ok: true, pendingPhoneNumber: true }); consumeOAuthState(response, "whatsapp"); return response;
    }

    const phone = await getPhoneNumber(body.phoneNumberId!, token);
    await registerCloudApiPhoneNumber(body.phoneNumberId!, token);
    await saveWhatsappConnection({
      tenantId: session.tenantId, token, wabaId: body.wabaId, phoneNumberId: body.phoneNumberId!,
      businessName: waba.name ?? phone.verified_name ?? "WhatsApp Business", businessId: waba.owner_business?.id ?? body.businessId ?? null,
      facebookUserId: body.facebookUserId, onboardingType: "cloud_api",
    });
    const response = NextResponse.json({ ok: true, onboardingType: "cloud_api" }); consumeOAuthState(response, "whatsapp"); return response;
  } catch (error) {
    console.error("WhatsApp Embedded Signup onboarding failed", { tenantId: session.tenantId, event, error: error instanceof Error ? error.message : "unknown" });
    const response = NextResponse.json({ error: "WhatsApp could not be connected. Please try again." }, { status: 502 }); consumeOAuthState(response, "whatsapp"); return response;
  }
}
