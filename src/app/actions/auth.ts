"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, clearSession } from "@/lib/auth";
import { database } from "@/lib/supabase";
import { randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendPasswordReset } from "@/lib/email";

function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function passwordIsValid(password: string) { return password.length >= 12 && password.length <= 128; }

export async function login(form: FormData) {
  const email = value(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const { data: user } = await database().from("client_users")
    .select("id, tenant_id, email, password_hash, is_active").eq("email", email).maybeSingle();
  if (!user || !user.is_active || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    redirect("/login?error=Invalid%20email%20or%20password");
  }
  await createSession({ userId: user.id, tenantId: user.tenant_id, email: user.email, sessionId: randomToken() });
  redirect("/dashboard");
}

export async function acceptInvitation(form: FormData) {
  const token = value(form, "token");
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (!passwordIsValid(password) || password !== confirmation) redirect(`/accept-invitation?token=${encodeURIComponent(token)}&error=Use%20a%20matching%20password%20of%20at%20least%2012%20characters`);
  const { data: user } = await database().from("client_users")
    .select("id, tenant_id, email, invitation_token_hash, invitation_expires_at, invitation_accepted_at, is_active")
    .eq("invitation_token_hash", sha256(token)).maybeSingle();
  if (!user || !user.is_active || user.invitation_accepted_at || !user.invitation_expires_at || new Date(user.invitation_expires_at) < new Date()) {
    redirect("/login?error=This%20invitation%20is%20invalid%20or%20expired");
  }
  const { error } = await database().from("client_users").update({
    password_hash: await bcrypt.hash(password, 12), invitation_token_hash: null, invitation_expires_at: null, invitation_accepted_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (error) redirect("/login?error=Unable%20to%20activate%20your%20account");
  await createSession({ userId: user.id, tenantId: user.tenant_id, email: user.email, sessionId: randomToken() });
  redirect("/dashboard");
}

export async function forgotPassword(form: FormData) {
  const email = value(form, "email").toLowerCase();
  const { data: user } = await database().from("client_users").select("id, is_active").eq("email", email).maybeSingle();
  if (user?.is_active) {
    const token = randomToken();
    await database().from("client_users").update({ reset_token_hash: sha256(token), reset_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() }).eq("id", user.id);
    try { await sendPasswordReset(email, `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`); } catch { /* Never disclose account or mail-provider state. */ }
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(form: FormData) {
  const token = value(form, "token");
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (!passwordIsValid(password) || password !== confirmation) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=Use%20a%20matching%20password%20of%20at%20least%2012%20characters`);
  const { data: user } = await database().from("client_users").select("id").eq("reset_token_hash", sha256(token)).gt("reset_expires_at", new Date().toISOString()).maybeSingle();
  if (!user) redirect("/forgot-password?error=That%20reset%20link%20is%20invalid%20or%20expired");
  await database().from("client_users").update({ password_hash: await bcrypt.hash(password, 12), reset_token_hash: null, reset_expires_at: null }).eq("id", user.id);
  redirect("/login?message=Your%20password%20has%20been%20reset");
}

export async function logout() { await clearSession(); redirect("/login"); }
