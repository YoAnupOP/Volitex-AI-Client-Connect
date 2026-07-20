import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { consumeOAuthState, verifyOAuthState } from "@/lib/oauth";
import { saveWhatsappConnection } from "@/lib/connection";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await request.json() as { code?: string; state?: string; wabaId?: string; phoneNumberId?: string };
  if (!body.code || !body.state || !body.wabaId || !body.phoneNumberId || !(await verifyOAuthState("whatsapp", body.state, session))) {
    return NextResponse.json({ error: "WhatsApp authorization could not be verified" }, { status: 400 });
  }
  try {
    const exchangeUrl = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/oauth/access_token`);
    exchangeUrl.searchParams.set("client_id", env.metaAppId); exchangeUrl.searchParams.set("client_secret", env.metaAppSecret); exchangeUrl.searchParams.set("code", body.code);
    const exchange = await fetch(exchangeUrl, { cache: "no-store" });
    if (!exchange.ok) throw new Error("Code exchange failed");
    const token = await exchange.json() as { access_token?: string };
    if (!token.access_token) throw new Error("No access token returned");
    const graphBase = `https://graph.facebook.com/${env.metaGraphVersion}`;
    const [phoneResult, wabaResult] = await Promise.all([
      fetch(`${graphBase}/${encodeURIComponent(body.phoneNumberId)}?${new URLSearchParams({ fields: "display_phone_number,verified_name", access_token: token.access_token })}`, { cache: "no-store" }),
      fetch(`${graphBase}/${encodeURIComponent(body.wabaId)}?${new URLSearchParams({ fields: "name,owner_business{id}", access_token: token.access_token })}`, { cache: "no-store" }),
    ]);
    if (!phoneResult.ok || !wabaResult.ok) throw new Error("Unable to validate WhatsApp assets");
    const phone = await phoneResult.json() as { verified_name?: string };
    const waba = await wabaResult.json() as { name?: string; owner_business?: { id?: string } };
    await saveWhatsappConnection({ tenantId: session.tenantId, token: token.access_token, wabaId: body.wabaId, phoneNumberId: body.phoneNumberId, businessName: waba.name ?? phone.verified_name ?? "WhatsApp Business", businessId: waba.owner_business?.id ?? null });
    const response = NextResponse.json({ ok: true }); consumeOAuthState(response, "whatsapp"); return response;
  } catch {
    const response = NextResponse.json({ error: "WhatsApp could not be connected. Please try again." }, { status: 502 }); consumeOAuthState(response, "whatsapp"); return response;
  }
}
