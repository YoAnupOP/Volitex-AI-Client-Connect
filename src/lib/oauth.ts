import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomToken, sign, verify } from "@/lib/crypto";
import type { Session } from "@/lib/auth";

export type Provider = "whatsapp" | "instagram";
type State = { provider: Provider; tenantId: string; sessionId: string; nonce: string };

const cookieName = (provider: Provider) => `volitex_oauth_${provider}`;

export function issueOAuthState(response: NextResponse, provider: Provider, session: Session) {
  const state = sign<State>({ provider, tenantId: session.tenantId, sessionId: session.sessionId, nonce: randomToken() }, 10 * 60);
  response.cookies.set(cookieName(provider), state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return state;
}

export async function verifyOAuthState(provider: Provider, candidate: string, session: Session): Promise<boolean> {
  const stored = (await cookies()).get(cookieName(provider))?.value;
  const state = verify<State>(candidate);
  return !!stored && stored === candidate && !!state && state.provider === provider && state.tenantId === session.tenantId && state.sessionId === session.sessionId;
}

export function consumeOAuthState(response: NextResponse, provider: Provider) {
  response.cookies.set(cookieName(provider), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
