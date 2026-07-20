import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, verify } from "@/lib/crypto";

const SESSION_COOKIE = "volitex_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type Session = { userId: string; tenantId: string; email: string; sessionId: string };

export async function createSession(session: Session) {
  const store = await cookies();
  store.set(SESSION_COOKIE, sign(session, SESSION_MAX_AGE), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verify<Session>(token) : null;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
