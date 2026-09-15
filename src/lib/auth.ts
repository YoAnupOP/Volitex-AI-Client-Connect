import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, verify } from "@/lib/crypto";

const CLIENT_COOKIE = "volitex_client_session";
const ADMIN_COOKIE = "volitex_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type Session = { tenantId: string; sessionId: string };
export type AdminSession = { adminId: string; email: string; role: "owner" | "operator"; sessionId: string };

export async function createSession(session: Session) {
  const store = await cookies();
  store.set(CLIENT_COOKIE, sign(session, SESSION_MAX_AGE), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(CLIENT_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(CLIENT_COOKIE)?.value;
  return token ? verify<Session>(token) : null;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/access-link?state=required");
  return session;
}

export async function createAdminSession(session: AdminSession) {
  (await cookies()).set(ADMIN_COOKIE, sign(session, SESSION_MAX_AGE), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
}
export async function clearAdminSession() { (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 }); }
export async function getAdminSession(): Promise<AdminSession | null> { const token = (await cookies()).get(ADMIN_COOKIE)?.value; return token ? verify<AdminSession>(token) : null; }
export async function requireAdmin(): Promise<AdminSession> { const admin = await getAdminSession(); if (!admin) redirect("/admin/login"); return admin; }
