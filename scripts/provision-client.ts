import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";
import { randomToken, sha256 } from "../src/lib/crypto";
import { database } from "../src/lib/supabase";
import { env } from "../src/lib/env";

loadEnvConfig(process.cwd());

function argument(name: string) {
  const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const tenantId = argument("--tenant-id"); const email = argument("--email")?.trim().toLowerCase(); const temporaryPassword = argument("--temporary-password");
  if (!tenantId || !email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Usage: npm run provision-client -- --tenant-id <uuid> --email <address> [--temporary-password <password>]");
  const token = randomToken(); const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: tenant, error: tenantError } = await database().from("tenants").select("id").eq("id", tenantId).maybeSingle();
  if (tenantError || !tenant) throw new Error("Tenant was not found");
  const { data: existing, error: existingError } = await database().from("client_users").select("id, tenant_id").eq("email", email).maybeSingle();
  if (existingError) throw existingError;
  if (existing && existing.tenant_id !== tenantId) throw new Error("That email is already linked to a different tenant");
  const values = {
    tenant_id: tenantId, email, is_active: true, invitation_token_hash: sha256(token), invitation_expires_at: invitationExpiresAt,
    password_hash: temporaryPassword ? await bcrypt.hash(temporaryPassword, 12) : null,
  };
  const { error } = existing
    ? await database().from("client_users").update(values).eq("id", existing.id)
    : await database().from("client_users").insert(values);
  if (error) throw error;
  console.log(`Invite client at: ${env.appUrl}/accept-invitation?token=${token}`);
  console.log(`Expires: ${invitationExpiresAt}`);
  if (temporaryPassword) console.log("A temporary password was set; the invitation link is still the preferred activation flow.");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
